// ==========================================
// ELEMENTS
// ==========================================

const video =
    document.getElementById("video");

const canvas =
    document.getElementById("canvas");

const ctx =
    canvas.getContext("2d");

const startButton =
    document.getElementById("startButton");

const stopButton =
    document.getElementById("stopButton");

const modelStatus =
    document.getElementById("modelStatus");

const cameraMessage =
    document.getElementById("cameraMessage");

const objectCount =
    document.getElementById("objectCount");

const fpsElement =
    document.getElementById("fps");

const cameraStatus =
    document.getElementById("cameraStatus");

const detectionsElement =
    document.getElementById("detections");

const confidence =
    document.getElementById("confidence");

const confidenceValue =
    document.getElementById("confidenceValue");


// ==========================================
// VARIABLES
// ==========================================

let model = null;

let stream = null;

let detecting = false;

let animationId = null;

let lastTime = performance.now();

let fps = 0;


// ==========================================
// CONFIDENCE SLIDER
// ==========================================

confidence.addEventListener(
    "input",
    () => {

        const value =
            Math.round(
                Number(confidence.value) * 100
            );

        confidenceValue.textContent =
            `${value}%`;

    }
);


// ==========================================
// LOAD AI MODEL
// ==========================================

async function loadModel() {

    try {

        modelStatus.textContent =
            "Loading AI Model...";

        cameraMessage.textContent =
            "Loading AI model...";


        model =
            await cocoSsd.load();


        modelStatus.textContent =
            "AI Model Ready";

        cameraMessage.textContent =
            "Click Start Camera";


        startButton.disabled = false;


        console.log(
            "COCO-SSD model loaded successfully"
        );


    } catch (error) {

        console.error(error);

        modelStatus.textContent =
            "Model Loading Failed";

        cameraMessage.textContent =
            "Failed to load AI model.";

    }

}


// ==========================================
// START CAMERA
// ==========================================

async function startCamera() {

    if (!model) {

        return;

    }


    try {

        stream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    video: {

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        },

                        facingMode: "user"

                    },

                    audio: false

                });


        video.srcObject =
            stream;


        await video.play();


        canvas.width =
            video.videoWidth;

        canvas.height =
            video.videoHeight;


        detecting = true;


        startButton.disabled =
            true;

        stopButton.disabled =
            false;


        cameraStatus.textContent =
            "On";


        cameraMessage.style.display =
            "none";


        detectObjects();


    } catch (error) {

        console.error(error);


        cameraMessage.style.display =
            "block";


        cameraMessage.textContent =
            "Camera permission denied.";

    }

}


// ==========================================
// STOP CAMERA
// ==========================================

function stopCamera() {

    detecting = false;


    if (animationId) {

        cancelAnimationFrame(
            animationId
        );

        animationId = null;

    }


    if (stream) {

        stream
            .getTracks()
            .forEach(track => {

                track.stop();

            });

        stream = null;

    }


    video.srcObject = null;


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    startButton.disabled =
        !model;

    stopButton.disabled =
        true;


    cameraStatus.textContent =
        "Off";


    objectCount.textContent =
        "0";


    fpsElement.textContent =
        "0";


    fps = 0;


    detectionsElement.innerHTML =
        `
        <p class="empty">
            No objects detected yet.
        </p>
        `;


    cameraMessage.style.display =
        "block";


    cameraMessage.textContent =
        "Click Start Camera";

}


// ==========================================
// OBJECT DETECTION
// ==========================================

async function detectObjects() {

    if (!detecting || !model) {

        return;

    }


    try {

        const predictions =
            await model.detect(video);


        const minimumConfidence =
            Number(
                confidence.value
            );


        const filtered =
            predictions.filter(
                prediction =>
                    prediction.score >=
                    minimumConfidence
            );


        calculateFPS();


        drawDetections(
            filtered
        );


        updateDetectionList(
            filtered
        );


    } catch (error) {

        console.error(error);

    }


    if (detecting) {

        animationId =
            requestAnimationFrame(
                detectObjects
            );

    }

}


// ==========================================
// DRAW DETECTIONS
// ==========================================

function drawDetections(
    predictions
) {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    predictions.forEach(
        prediction => {

            const [
                x,
                y,
                width,
                height
            ] =
                prediction.bbox;


            const score =
                Math.round(
                    prediction.score * 100
                );


            const label =
                `${prediction.class} ${score}%`;


            // Bounding box

            ctx.strokeStyle =
                "#22c55e";

            ctx.lineWidth =
                3;


            ctx.strokeRect(
                x,
                y,
                width,
                height
            );


            // Label background

            ctx.font =
                "bold 16px Arial";


            const textWidth =
                ctx.measureText(
                    label
                ).width;


            const labelHeight =
                28;


            ctx.fillStyle =
                "rgba(34, 197, 94, 0.9)";


            ctx.fillRect(
                x,
                Math.max(
                    0,
                    y - labelHeight
                ),
                textWidth + 12,
                labelHeight
            );


            // Label text

            ctx.fillStyle =
                "#000000";


            ctx.fillText(
                label,
                x + 6,
                Math.max(
                    19,
                    y - 8
                )
            );

        }
    );

}


// ==========================================
// UPDATE DETECTION LIST
// ==========================================

function updateDetectionList(
    predictions
) {

    objectCount.textContent =
        predictions.length;


    if (
        predictions.length === 0
    ) {

        detectionsElement.innerHTML =
            `
            <p class="empty">
                No objects detected.
            </p>
            `;

        return;

    }


    const counts = {};


    predictions.forEach(
        prediction => {

            const name =
                prediction.class;


            if (!counts[name]) {

                counts[name] = 0;

            }


            counts[name]++;

        }
    );


    detectionsElement.innerHTML =
        "";


    Object.entries(
        counts
    ).forEach(
        ([name, count]) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "detection-item";


            item.innerHTML =
                `
                ${name}
                <span>
                    × ${count}
                </span>
                `;


            detectionsElement.appendChild(
                item
            );

        }
    );

}


// ==========================================
// FPS CALCULATION
// ==========================================

function calculateFPS() {

    const currentTime =
        performance.now();


    const delta =
        currentTime - lastTime;


    if (delta > 0) {

        const currentFPS =
            1000 / delta;


        fps =
            fps * 0.8 +
            currentFPS * 0.2;


        fpsElement.textContent =
            Math.round(fps);

    }


    lastTime =
        currentTime;

}


// ==========================================
// BUTTON EVENTS
// ==========================================

startButton.addEventListener(
    "click",
    startCamera
);


stopButton.addEventListener(
    "click",
    stopCamera
);


// ==========================================
// START APPLICATION
// ==========================================

loadModel();