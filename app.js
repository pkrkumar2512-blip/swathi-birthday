// ==========================================
// CINEMATIC FRIENDSHIP EXPERIENCE CONTROLLER - BIRTHDAY EDITION
// ==========================================

// Global state variables
let currentSceneIndex = 0;
const totalScenes = 11;
let audioContext = null;
let synthLoopInterval = null;
let currentSynthNotes = [];
let isMusicMuted = false;
let isAudioInitialized = false;
let masterGainNode = null;

// Photo system assets array
const photoList = [
    'images/photo1.jpg',
    'images/photo2.jpg',
    'images/photo3.jpg',
    'images/photo4.jpg',
    'images/photo5.jpg',
    'images/photo6.jpg',
    'images/photo7.jpg',
    'images/photo8.jpg'
];

// Helper to identify rotated landscape photos (photo2.jpg, photo3.jpg, photo6.jpg)
function isRotatedPhoto(src) {
    if (!src) return false;
    return src.includes('photo2.jpg') || src.includes('photo3.jpg') || src.includes('photo6.jpg');
}

// Helper to identify clockwise rotated landscape photos (photo4.jpg)
function isRotatedCWRoto(src) {
    if (!src) return false;
    return src.includes('photo4.jpg');
}

// Preload Images cleanly (no canvas operations to prevent local file protocol CORS SecurityError)
const loadedImages = [];
let loadedCount = 0;

photoList.forEach((src, idx) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        loadedImages[idx] = img;
        loadedCount++;
    };
    img.onerror = () => {
        // Create canvas placeholder if image fails to load
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 400;
        fallbackCanvas.height = 400;
        const ctx = fallbackCanvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 400, 400);
        grad.addColorStop(0, '#9b59b6');
        grad.addColorStop(1, '#00f2fe');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`MEMORIES`, 200, 180);
        ctx.font = '24px Poppins';
        ctx.fillText(`Inside Joke #${idx + 1} 🤝`, 200, 230);
        
        const fallbackImg = new Image();
        fallbackImg.src = fallbackCanvas.toDataURL();
        fallbackImg.onload = () => {
            loadedImages[idx] = fallbackImg;
            loadedCount++;
        };
    };
});

// Document load handler
window.addEventListener('DOMContentLoaded', () => {
    initStarsBackground();
    initSceneIndicators();
    setupTimeline();
    setupGallery();
    setupQuiz();
    setupEvadeButton();
    updateNavigationUI();
    
    // Tap to unlock audio listener
   // Tap to unlock audio listener
document.body.addEventListener('click', initAudioEngine, { once: true });
document.body.addEventListener('touchstart', initAudioEngine, { once: true });

// Extra mobile support
const bgMusic = document.getElementById('bg-music');

function forcePlayMusic() {
    if (!bgMusic) return;

    bgMusic.play()
        .then(() => {
            console.log("Music started successfully");
        })
        .catch(err => {
            console.log("Music blocked:", err);
        });
}

document.addEventListener('click', forcePlayMusic, { once: true });
document.addEventListener('touchstart', forcePlayMusic, { once: true });
});

// ==========================================
// SCENE STATE MACHINE & PROGRESS
// ==========================================
function updateNavigationUI() {
    // Hide/show scenes based on active state
    for (let i = 1; i <= totalScenes; i++) {
        const sceneEl = document.getElementById(`scene-${i}`);
        if (i === currentSceneIndex + 1) {
            sceneEl.classList.add('active');
            triggerSceneSpecialActions(i);
        } else {
            sceneEl.classList.remove('active');
        }
    }

    // Progress Bar Update
    const progressPercent = Math.round((currentSceneIndex / (totalScenes - 1)) * 100);
    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('progress-percent').innerText = `${progressPercent}%`;

    // Update side indicators
    const dots = document.querySelectorAll('.scene-indicator-dot');
    dots.forEach((dot, idx) => {
        if (idx === currentSceneIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function nextScene() {
    if (currentSceneIndex < totalScenes - 1) {
        playSFX('click');
        currentSceneIndex++;
        updateNavigationUI();
    }
}

function prevScene() {
    if (currentSceneIndex > 0) {
        playSFX('click');
        currentSceneIndex--;
        updateNavigationUI();
    }
}

function goToScene(index) {
    if (index >= 0 && index < totalScenes) {
        playSFX('click');
        currentSceneIndex = index;
        updateNavigationUI();
    }
}

function initSceneIndicators() {
    const container = document.getElementById('side-indicators');
    container.innerHTML = '';
    for (let i = 0; i < totalScenes; i++) {
        const dot = document.createElement('div');
        dot.className = 'scene-indicator-dot';
        dot.title = `Scene ${i + 1}`;
        dot.addEventListener('click', () => goToScene(i));
        container.appendChild(dot);
    }
}

function restartJourney() {
    playSFX('success');
    currentSceneIndex = 0;
    
    // Reset specific states
    hasQuizCompleted = false;
    currentQuizIndex = 0;
    hasAwardsUnlocked = false;
    hasTypewriterRun = false;
    hasStatsAnimated = false;
    
    // Make sure evade game reset
    document.getElementById('btn-evade').style.display = 'inline-flex';
    document.getElementById('game-success').classList.remove('show');
    document.getElementById('game-continue-btn-box').style.display = 'none';
    
    updateNavigationUI();
}

// Scene Actions Triggers
function triggerSceneSpecialActions(sceneNum) {
    if (sceneNum === 1) {
        initIntroMorphCanvas();
    } else if (sceneNum === 2) {
        spawnTitlePolaroids();
    } else if (sceneNum === 4) {
        setTimeout(() => {
            const items = document.querySelectorAll('.timeline-item');
            items.forEach((item, idx) => {
                setTimeout(() => {
                    item.classList.add('in-view');
                }, idx * 250);
            });
        }, 100);
    } else if (sceneNum === 7) {
        startRapidFire();
    } else if (sceneNum === 8) {
        triggerAwardsUnlocks();
    } else if (sceneNum === 9) {
        triggerTypewriter();
    } else if (sceneNum === 10) {
        triggerStatsCounter();
    } else if (sceneNum === 11) {
        initFireworksEngine();
        boostMusicVolume();
    }
}

// ==========================================
// AUDIO SYNTHESIZER ENGINE (Web Audio API)
// ==========================================
function initAudioEngine() {
    if (isAudioInitialized) return;
    
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();
        
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        masterGainNode.connect(audioContext.destination);
        
        const bgMusic = document.getElementById('bg-music');
        let playPromise = null;
        
        if (bgMusic) {
    bgMusic.volume = 0.3;
    bgMusic.muted = false;
    bgMusic.setAttribute('playsinline', '');
    playPromise = bgMusic.play();
}
        
        if (playPromise !== null) {
            playPromise.then(() => {
                console.log("Playing local background music.mp3 natively!");
                isAudioInitialized = true;
            }).catch(error => {
                console.log("Failed to play custom music.mp3 natively, falling back to synth pad loop.");
                startAmbientPadLoop();
                isAudioInitialized = true;
            });
        } else {
            startAmbientPadLoop();
            isAudioInitialized = true;
        }
        
        const banner = document.getElementById('audio-banner');
        if (banner) {
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 1000);
        }
    } catch(e) {
        console.error("Audio Context initialization failed", e);
    }
}

function playSFX(type) {
    if (!isAudioInitialized || isMusicMuted || !audioContext) return;
    
    const now = audioContext.currentTime;
    
    if (type === 'click') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.connect(gain);
        gain.connect(masterGainNode);
        osc.start(now);
        osc.stop(now + 0.13);
        
    } else if (type === 'unlock') {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
        notes.forEach((freq, index) => {
            const time = now + index * 0.08;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1500, time);
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.05, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGainNode);
            osc.start(time);
            osc.stop(time + 0.45);
        });
        
    } else if (type === 'success') {
        const baseFreq = 523.25;
        [0, 0.05, 0.1].forEach((delay, idx) => {
            const time = now + delay;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * (idx === 0 ? 1 : idx === 1 ? 1.25 : 1.5), time);
            
            gain.gain.setValueAtTime(0.05, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            
            osc.connect(gain);
            gain.connect(masterGainNode);
            osc.start(time);
            osc.stop(time + 0.35);
        });
    }
}

function startAmbientPadLoop() {
    if (!audioContext) return;
    
    const progressions = [
        [130.81, 164.81, 196.00, 246.94], // C3, E3, G3, B3 (Cmaj7)
        [110.00, 130.81, 164.81, 196.00], // A2, C3, E3, G3 (Am7)
        [87.31, 130.81, 174.61, 220.00],  // F2, C3, F3, A3 (Fmaj7)
        [98.00, 146.83, 196.00, 246.94]   // G2, D3, G3, B3 (Gmaj7)
    ];
    
    let currentChordIndex = 0;
    
    function playNextChord() {
        const chord = progressions[currentChordIndex];
        const duration = 7000;
        const now = audioContext.currentTime;
        const fadeTime = 2.5;
        
        const nextSynthNotes = [];
        
        chord.forEach((freq, idx) => {
            const osc = audioContext.createOscillator();
            const oscDetune = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            
            oscDetune.type = 'sawtooth';
            oscDetune.frequency.setValueAtTime(freq + (Math.random() * 1.5 - 0.75), now);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350, now);
            filter.Q.setValueAtTime(1, now);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.04, now + fadeTime);
            gain.gain.setValueAtTime(0.04, now + (duration / 1000) - fadeTime);
            gain.gain.linearRampToValueAtTime(0.0001, now + (duration / 1000));
            
            osc.connect(filter);
            oscDetune.connect(filter);
            filter.connect(gain);
            gain.connect(masterGainNode);
            
            osc.start(now);
            oscDetune.start(now);
            
            osc.stop(now + (duration / 1000));
            oscDetune.stop(now + (duration / 1000));
            
            nextSynthNotes.push({ osc, oscDetune, gain });
        });
        
        currentSynthNotes = nextSynthNotes;
        currentChordIndex = (currentChordIndex + 1) % progressions.length;
    }
    
    playNextChord();
    synthLoopInterval = setInterval(playNextChord, 6500);
}

function boostMusicVolume() {
    if (!masterGainNode || !audioContext) return;
    const now = audioContext.currentTime;
    masterGainNode.gain.linearRampToValueAtTime(0.5, now + 1.5);
    
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic && !isMusicMuted) {
        bgMusic.volume = 0.5; // Boost volume directly on the native element
    }
}

const muteBtn = document.getElementById('music-toggle-btn');
muteBtn.addEventListener('click', () => {
    if (!isAudioInitialized) {
        initAudioEngine();
        return;
    }
    
    isMusicMuted = !isMusicMuted;
    const bgMusic = document.getElementById('bg-music');
    
    if (isMusicMuted) {
        muteBtn.classList.add('muted');
        masterGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        if (bgMusic) bgMusic.volume = 0;
    } else {
        muteBtn.classList.remove('muted');
        const targetVol = (currentSceneIndex === 10) ? 0.5 : 0.3;
        masterGainNode.gain.linearRampToValueAtTime(targetVol, audioContext.currentTime + 0.5);
        if (bgMusic) bgMusic.volume = targetVol;
    }
});

// ==========================================
// BACKGROUND FLOATING STARS ENGINE
// ==========================================
function initStarsBackground() {
    const canvas = document.getElementById('canvas-bg');
    const ctx = canvas.getContext('2d');
    
    let stars = [];
    const maxStars = 80;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    for (let i = 0; i < maxStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.05 + 0.01,
            brightness: Math.random(),
            pulseSpeed: Math.random() * 0.02 + 0.005
        });
    }
    
    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        stars.forEach(star => {
            star.brightness += star.pulseSpeed;
            if (star.brightness > 1 || star.brightness < 0) {
                star.pulseSpeed = -star.pulseSpeed;
            }
            
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, star.brightness)})`;
            ctx.shadowBlur = star.size * 4;
            ctx.shadowColor = '#00f2fe';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            star.y -= star.speed * 20;
            if (star.y < 0) {
                star.y = canvas.height;
                star.x = Math.random() * canvas.width;
            }
        });
        
        requestAnimationFrame(drawStars);
    }
    
    drawStars();
}

// ==========================================
// SCENE 1 - HEART TO INFINITY TRANSFORMATION
// ==========================================
let morphCanvasInitialized = false;

function initIntroMorphCanvas() {
    if (morphCanvasInitialized) return;
    morphCanvasInitialized = true;
    
    const canvas = document.getElementById('canvas-intro-morph');
    const ctx = canvas.getContext('2d');
    
    let particles = [];
    const particleCount = 70;
    let currentShape = 'heart';
    let transitionProgress = 0;
    let stateTimer = 0;
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    
    function getHeartCoord(t, scale) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
        return { x: x * scale, y: -y * scale };
    }
    
    // Bernoulli Lemniscate
    function getInfinityCoord(t, scale) {
        const cos_t = Math.cos(t);
        const sin_t = Math.sin(t);
        const denom = 1 + sin_t * sin_t;
        return {
            x: (scale * 2.2 * cos_t) / denom,
            y: (scale * 2.2 * sin_t * cos_t) / denom
        };
    }
    
    const sizeScale = Math.min(canvas.width, canvas.height) * 0.015;
    
    for (let i = 0; i < particleCount; i++) {
        const t = (i / particleCount) * Math.PI * 2;
        const hPt = getHeartCoord(t, sizeScale);
        const iPt = getInfinityCoord(t, sizeScale * 7.5);
        
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            heartX: hPt.x,
            heartY: hPt.y,
            infX: iPt.x,
            infY: iPt.y,
            size: Math.random() * 3 + 2,
            color: i % 2 === 0 ? '#00f2fe' : '#9b59b6',
            glow: Math.random() * 10 + 5,
            photoIdx: i % 8
        });
    }
    
    const text1 = document.getElementById('intro-text-line1');
    const text2 = document.getElementById('intro-text-line2');
    const text3 = document.getElementById('intro-text-line3');
    const btnBox = document.getElementById('intro-start-btn-box');
    
    setTimeout(() => text1.classList.add('visible'), 500);
    setTimeout(() => text2.classList.add('visible'), 2500);
    setTimeout(() => text3.classList.add('visible'), 4500);
    setTimeout(() => btnBox.classList.add('visible'), 6500);
    
    function animateMorph() {
        if (currentSceneIndex !== 0) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stateTimer += 0.016;
        
        if (stateTimer > 4 && currentShape === 'heart') {
            currentShape = 'transition';
        }
        
        if (currentShape === 'transition') {
            transitionProgress += 0.008;
            if (transitionProgress >= 1) {
                transitionProgress = 1;
                currentShape = 'infinity';
            }
        }
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        particles.forEach((p, idx) => {
            let targetX = centerX + p.heartX;
            let targetY = centerY + p.heartY;
            
            if (currentShape === 'infinity') {
                targetX = centerX + p.infX;
                targetY = centerY + p.infY;
            } else if (currentShape === 'transition') {
                const xBlend = p.heartX + (p.infX - p.heartX) * transitionProgress;
                const yBlend = p.heartY + (p.infY - p.heartY) * transitionProgress;
                targetX = centerX + xBlend;
                targetY = centerY + yBlend;
            }
            
            p.x += (targetX - p.x) * 0.05;
            p.y += (targetY - p.y) * 0.05;
            
            ctx.shadowBlur = p.glow;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            if (idx % 12 === 0 && loadedImages.length > 0) {
                const imgIdx = (idx / 12) % loadedImages.length;
                const polaroidImg = loadedImages[imgIdx];
                if (polaroidImg) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    
                    const cardW = 40;
                    const cardH = 50;
                    ctx.fillStyle = '#ffffff';
                    
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((idx % 5 - 2) * 0.05);
                    
                    // Rotate landscape photos to draw upright on canvas
                    if (imgIdx === 1 || imgIdx === 2 || imgIdx === 5) {
                        ctx.rotate(-Math.PI / 2);
                    } else if (imgIdx === 3) {
                        ctx.rotate(Math.PI / 2);
                    }
                    
                    ctx.fillRect(-cardW/2, -cardH/2, cardW, cardH);
                    
                    try {
                        // Calculate aspect ratio of polaroidImg to prevent squishing
                        const imgAspect = polaroidImg.width / polaroidImg.height;
                        const frameW = cardW - 6;
                        const frameH = cardH - 12;
                        const frameAspect = frameW / frameH;
                        
                        let drawW = frameW;
                        let drawH = frameH;
                        let drawX = -cardW/2 + 3;
                        let drawY = -cardH/2 + 3;
                        
                        if (imgAspect > frameAspect) {
                            drawH = frameW / imgAspect;
                            drawY += (frameH - drawH) / 2;
                        } else {
                            drawW = frameH * imgAspect;
                            drawX += (frameW - drawW) / 2;
                        }
                        
                        ctx.fillStyle = '#02020a';
                        ctx.fillRect(-cardW/2 + 3, -cardH/2 + 3, frameW, frameH);
                        ctx.drawImage(polaroidImg, drawX, drawY, drawW, drawH);
                    } catch(err){}
                    ctx.restore();
                }
            }
        });
        
        ctx.shadowBlur = 0;
        requestAnimationFrame(animateMorph);
    }
    
    animateMorph();
}

// ==========================================
// SCENE 2 - TITLE SCREEN FLOATING BACKGROUND
// ==========================================
let titlePolaroidsSpawned = false;

function spawnTitlePolaroids() {
    if (titlePolaroidsSpawned) return;
    titlePolaroidsSpawned = true;
    
    const container = document.getElementById('title-polaroids-container');
    container.innerHTML = '';
    
    const coords = [
        { top: '15%', left: '10%', rot: '-12deg', speed: '6s', dx: '20px', dy: '-15px' },
        { top: '20%', right: '8%', rot: '15deg', speed: '8s', dx: '-30px', dy: '10px' },
        { bottom: '15%', left: '12%', rot: '8deg', speed: '7s', dx: '15px', dy: '20px' },
        { bottom: '18%', right: '10%', rot: '-15deg', speed: '9s', dx: '-25px', dy: '-25px' },
        { top: '45%', left: '5%', rot: '5deg', speed: '11s', dx: '10px', dy: '-20px' },
        { top: '50%', right: '5%', rot: '-8deg', speed: '10s', dx: '-15px', dy: '15px' }
    ];
    
    coords.forEach((coord, index) => {
        const polaroid = document.createElement('div');
        polaroid.className = 'polaroid bg-polaroid';
        polaroid.style.top = coord.top || 'auto';
        polaroid.style.bottom = coord.bottom || 'auto';
        polaroid.style.left = coord.left || 'auto';
        polaroid.style.right = coord.right || 'auto';
        polaroid.style.setProperty('--rot', coord.rot);
        polaroid.style.setProperty('--speed', coord.speed);
        polaroid.style.setProperty('--x-offset', coord.dx);
        polaroid.style.setProperty('--y-offset', coord.dy);
        
        const frame = document.createElement('div');
        frame.className = 'photo-frame';
        
        const photoIdx = index % photoList.length;
        const photoSrc = photoList[photoIdx];
        
        const blurImg = document.createElement('img');
        if (isRotatedPhoto(photoSrc)) {
            blurImg.className = 'polaroid-blur-bg rotated-photo';
        } else if (isRotatedCWRoto(photoSrc)) {
            blurImg.className = 'polaroid-blur-bg rotated-photo-cw';
        } else {
            blurImg.className = 'polaroid-blur-bg';
        }
        blurImg.src = photoSrc;
        blurImg.onerror = () => blurImg.remove();
        
        const mainImg = document.createElement('img');
        if (isRotatedPhoto(photoSrc)) {
            mainImg.className = 'polaroid-main-img rotated-photo';
        } else if (isRotatedCWRoto(photoSrc)) {
            mainImg.className = 'polaroid-main-img rotated-photo-cw';
        } else {
            mainImg.className = 'polaroid-main-img';
        }
        mainImg.src = photoSrc;
        mainImg.alt = 'Memory';
        mainImg.onerror = () => {
            frame.style.background = 'linear-gradient(135deg, var(--color-purple), var(--color-blue))';
            mainImg.remove();
            blurImg.remove();
        };
        
        frame.appendChild(blurImg);
        frame.appendChild(mainImg);
        polaroid.appendChild(frame);
        
        const caption = document.createElement('div');
        caption.className = 'caption';
        caption.innerText = `Memory #${2022 + index}`;
        polaroid.appendChild(caption);
        
        container.appendChild(polaroid);
    });
}

// ==========================================
// SCENE 3 - INTERACTIVE GAME (Evade Button)
// ==========================================
function setupEvadeButton() {
    const evadeBtn = document.getElementById('btn-evade');
    const container = document.getElementById('game-options-container');
    
    function moveButton() {
        playSFX('click');
        const contRect = container.getBoundingClientRect();
        const btnRect = evadeBtn.getBoundingClientRect();
        
        const maxX = contRect.width - btnRect.width;
        const maxY = contRect.height - btnRect.height;
        
        const newX = Math.random() * maxX;
        const newY = (Math.random() * maxY) - (maxY/2);
        
        evadeBtn.style.left = `${newX}px`;
        evadeBtn.style.top = `${newY}px`;
    }
    
    evadeBtn.addEventListener('mouseover', moveButton);
    evadeBtn.addEventListener('click', moveButton);
}

function selectCorrectFriend(btn) {
    playSFX('success');
    document.getElementById('btn-evade').style.display = 'none';
    
    const message = document.getElementById('game-success');
    message.classList.add('show');
    
    document.getElementById('game-continue-btn-box').style.display = 'block';
}

// ==========================================
// SCENE 4 - TIMELINE GENERATION (PURE & SOULFUL)
// ==========================================
const timelineData = [
    { title: 'A Pure Connection 🤝', text: 'Our bond started as a simple connection, but it grew into something pure and soulful. A bond built on absolute trust.', img: 'images/photo1.jpg', rot: '-2' },
    { title: 'Truest Selves 📸', text: 'With you, I can be my truest self. No pretenses, no filters—just a pure friendship that accepts all my goofy moments.', img: 'images/photo2.jpg', rot: '3' },
    { title: 'Silent Understanding ☕', text: 'Through the silent struggles and the loudest laughs, our souls connected. You understand me even when I say nothing.', img: 'images/photo3.jpg', rot: '-3' },
    { title: 'Constant Sanctuary 🚗', text: 'A pure, loyal friendship is rare. Finding you made me realize what a true soulful bond feels like. My constant anchor.', img: 'images/photo4.jpg', rot: '2' },
    { title: 'Peace in the Chaos ❤️', text: 'No matter how hectic or confusing life gets, our bond remains peaceful and stable. A safe haven of pure comfort.', img: 'images/photo5.jpg', rot: '-2' },
    { title: 'Unbreakable Sisterhood 😎', text: 'We laugh at the silliest things and roast each other daily, but deep down, our connection is completely unbreakable.', img: 'images/photo6.jpg', rot: '4' },
    { title: 'Written in the Hearts 🤝', text: 'Time and distance can never weaken what is written in our hearts. Our friendship is a lifetime promise of loyalty.', img: 'images/photo7.jpg', rot: '-3' },
    { title: 'Family by Choice 🏆', text: 'Some friends are sent by destiny to become family. Thank you for being the most soulful and pure part of my life.', img: 'images/photo8.jpg', rot: '3' }
];

function setupTimeline() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '<div class="timeline-line"></div>';
    
    timelineData.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'timeline-item';
        
        const dot = document.createElement('div');
        dot.className = 'timeline-dot';
        
        const content = document.createElement('div');
        content.className = 'timeline-content';
        
        const card = document.createElement('div');
        card.className = 'timeline-card polaroid-interactive';
        card.style.setProperty('--rot-dir', item.rot);
        
        const textBlock = document.createElement('div');
        textBlock.style.flex = '1';
        
        const titleH3 = document.createElement('h3');
        titleH3.className = 'title';
        titleH3.innerText = item.title;
        
        const descP = document.createElement('p');
        descP.style.fontSize = '0.85rem';
        descP.style.color = 'var(--text-muted)';
        descP.innerText = item.text;
        
        textBlock.appendChild(titleH3);
        textBlock.appendChild(descP);
        
        const photoDiv = document.createElement('div');
        photoDiv.className = 'timeline-photo';
        
        const blurImg = document.createElement('img');
        if (isRotatedPhoto(item.img)) {
            blurImg.className = 'timeline-blur-bg rotated-photo';
        } else if (isRotatedCWRoto(item.img)) {
            blurImg.className = 'timeline-blur-bg rotated-photo-cw';
        } else {
            blurImg.className = 'timeline-blur-bg';
        }
        blurImg.src = item.img;
        blurImg.onerror = () => blurImg.remove();
        
        const mainImg = document.createElement('img');
        if (isRotatedPhoto(item.img)) {
            mainImg.className = 'timeline-main-img rotated-photo';
        } else if (isRotatedCWRoto(item.img)) {
            mainImg.className = 'timeline-main-img rotated-photo-cw';
        } else {
            mainImg.className = 'timeline-main-img';
        }
        mainImg.src = item.img;
        mainImg.alt = item.title;
        mainImg.onerror = () => {
            photoDiv.style.background = 'linear-gradient(45deg, var(--color-purple), var(--color-blue))';
            photoDiv.style.display = 'flex';
            photoDiv.style.alignItems = 'center';
            photoDiv.style.justifyContent = 'center';
            photoDiv.innerText = '❤️';
            mainImg.remove();
            blurImg.remove();
        };
        
        photoDiv.appendChild(blurImg);
        photoDiv.appendChild(mainImg);
        
        card.appendChild(textBlock);
        card.appendChild(photoDiv);
        content.appendChild(card);
        
        itemEl.appendChild(dot);
        itemEl.appendChild(content);
        
        container.appendChild(itemEl);
    });
}

// ==========================================
// SCENE 5 - PREMIUM SLIDESHOW GALLERY
// ==========================================
const gallerySlidesData = [
    { img: 'images/photo1.jpg', caption: 'Partners In Crime Since Day One' },
    { img: 'images/photo2.jpg', caption: 'This Day Still Makes Me Laugh' },
    { img: 'images/photo3.jpg', caption: 'One Photo, A Thousand Memories' },
    { img: 'images/photo4.jpg', caption: 'Still My Favourite Memory' },
    { img: 'images/photo5.jpg', caption: 'Unstoppable Duo in Action' }
];

let activeSlideIndex = 0;
let galleryInterval = null;

function setupGallery() {
    const slidesContainer = document.getElementById('gallery-slides-container');
    const dotsContainer = document.getElementById('gallery-dots-container');
    
    slidesContainer.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    gallerySlidesData.forEach((slide, idx) => {
        const slideEl = document.createElement('div');
        slideEl.className = `gallery-slide ${idx === 0 ? 'active' : ''}`;
        
        const imgBox = document.createElement('div');
        imgBox.className = 'gallery-image-box';
        
        const blurImg = document.createElement('img');
        if (isRotatedPhoto(slide.img)) {
            blurImg.className = 'gallery-blur-bg rotated-photo';
        } else if (isRotatedCWRoto(slide.img)) {
            blurImg.className = 'gallery-blur-bg rotated-photo-cw';
        } else {
            blurImg.className = 'gallery-blur-bg';
        }
        blurImg.src = slide.img;
        blurImg.onerror = () => blurImg.remove();
        
        const mainImg = document.createElement('img');
        if (isRotatedPhoto(slide.img)) {
            mainImg.className = 'gallery-main-img rotated-photo';
        } else if (isRotatedCWRoto(slide.img)) {
            mainImg.className = 'gallery-main-img rotated-photo-cw';
        } else {
            mainImg.className = 'gallery-main-img';
        }
        mainImg.src = slide.img;
        mainImg.alt = slide.caption;
        mainImg.onerror = () => {
            imgBox.style.background = 'linear-gradient(135deg, var(--color-purple), var(--color-blue))';
            mainImg.remove();
            blurImg.remove();
        };
        
        imgBox.appendChild(blurImg);
        imgBox.appendChild(mainImg);
        
        const caption = document.createElement('div');
        caption.className = 'gallery-caption';
        caption.innerText = slide.caption;
        
        slideEl.appendChild(imgBox);
        slideEl.appendChild(caption);
        slidesContainer.appendChild(slideEl);
        
        const dot = document.createElement('div');
        dot.className = `gallery-dot ${idx === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => {
            playSFX('click');
            setSlideActive(idx);
        });
        dotsContainer.appendChild(dot);
    });
    
    startGalleryLoop();
}

function startGalleryLoop() {
    if (galleryInterval) clearInterval(galleryInterval);
    galleryInterval = setInterval(() => {
        if (currentSceneIndex === 4) {
            let next = (activeSlideIndex + 1) % gallerySlidesData.length;
            setSlideActive(next);
        }
    }, 5000);
}

function setSlideActive(index) {
    activeSlideIndex = index;
    
    const slides = document.querySelectorAll('.gallery-slide');
    const dots = document.querySelectorAll('.gallery-dot');
    
    slides.forEach((slide, idx) => {
        if (idx === index) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    dots.forEach((dot, idx) => {
        if (idx === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function nextSlide() {
    playSFX('click');
    let next = (activeSlideIndex + 1) % gallerySlidesData.length;
    setSlideActive(next);
    startGalleryLoop();
}

function prevSlide() {
    playSFX('click');
    let prev = (activeSlideIndex - 1 + gallerySlidesData.length) % gallerySlidesData.length;
    setSlideActive(prev);
    startGalleryLoop();
}

// ==========================================
// SCENE 6 - FRIENDSHIP QUIZ
// ==========================================
const quizQuestions = [
    {
        q: "Who spends more money? 💸",
        options: ["Swathi on birthday shopping 😂", "Me trying to match her 😭", "Both of us (broke together) 🤝"]
    },
    {
        q: "Who replies late to texts? 📱",
        options: ["The professional ghoster 👻", "The 'read in notification' forgetter 😂", "Depends on who is sleeping 😴"]
    },
    {
        q: "Who is the real birthday drama queen? 👑",
        options: ["Swathi 💅", "Swathi (again) 🎭", "Definitely Swathi 😂"]
    },
    {
        q: "Who gets into trouble first? 🚔",
        options: ["The idea creator 😎", "The one who actually did it 😂", "Both, we are a package deal 📦"]
    },
    {
        q: "Who is funnier? 🎭",
        options: ["The stand-up comedian 🎤", "The one laughing at the jokes 😂", "We are a meme channel 📺"]
    }
];

let currentQuizIndex = 0;
let hasQuizCompleted = false;

function setupQuiz() {
    displayQuizQuestion();
}

function displayQuizQuestion() {
    const data = quizQuestions[currentQuizIndex];
    
    document.getElementById('quiz-question-counter').innerText = `Question ${currentQuizIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('quiz-question-text').innerText = data.q;
    
    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = '';
    
    data.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.innerText = opt;
        btn.onclick = () => selectQuizOption(btn);
        optionsContainer.appendChild(btn);
    });
    
    document.getElementById('quiz-feedback').classList.remove('show');
    document.getElementById('quiz-next-btn-box').style.display = 'none';
}

function selectQuizOption(selectedBtn) {
    playSFX('success');
    
    const btns = document.querySelectorAll('.quiz-option-btn');
    btns.forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.5';
    });
    
    selectedBtn.style.opacity = '1';
    selectedBtn.style.borderColor = 'var(--color-gold)';
    selectedBtn.style.background = 'rgba(243, 156, 18, 0.1)';
    
    const feedback = document.getElementById('quiz-feedback');
    feedback.innerText = "Correct 😂";
    feedback.classList.add('show');
    
    const nextBtnBox = document.getElementById('quiz-next-btn-box');
    const actionBtn = document.getElementById('quiz-action-btn');
    
    if (currentQuizIndex === quizQuestions.length - 1) {
        actionBtn.innerText = "Unlock Rapid Fire! ⚡";
    } else {
        actionBtn.innerText = "Next Question ❯";
    }
    
    nextBtnBox.style.display = 'block';
}

function advanceQuiz() {
    if (currentQuizIndex < quizQuestions.length - 1) {
        currentQuizIndex++;
        displayQuizQuestion();
    } else {
        hasQuizCompleted = true;
        nextScene();
    }
}

// ==========================================
// SCENE 7 - RAPID FIRE ROUND
// ==========================================
const rapidData = [
    { left: 'Badam Milk 🥛', right: 'Fruit Mixed 🍹' },
    { left: 'Prabhas 👑', right: 'Ram Pothineni 🌟' },
    { left: 'Kabaddi 🤼', right: 'Badminton 🏸' },
    { left: 'KTM 🏍️', right: 'Duke ⚡' },
    { left: 'Innocent 😇', right: 'Dark Minded 😈' }
];

let rapidIndex = 0;
let rapidTimer = null;
const rapidDuration = 5000; // Increased timing to 5 seconds

function startRapidFire() {
    rapidIndex = 0;
    showRapidDuel();
}

function showRapidDuel() {
    if (currentSceneIndex !== 6) return;
    
    if (rapidIndex >= rapidData.length) {
        document.getElementById('rapid-round-title').innerText = "⚡ DUEL COMPLETED! ⚡";
        document.getElementById('rapid-opt-left').innerText = "Perfect Match";
        document.getElementById('rapid-opt-right').innerText = "Every Time";
        document.getElementById('rapid-timer-fill').style.width = '100%';
        return;
    }
    
    const duel = rapidData[rapidIndex];
    document.getElementById('rapid-round-title').innerText = `ROUND ${rapidIndex + 1} OF ${rapidData.length}`;
    
    const leftBtn = document.getElementById('rapid-opt-left');
    const rightBtn = document.getElementById('rapid-opt-right');
    
    leftBtn.innerText = duel.left;
    rightBtn.innerText = duel.right;
    
    leftBtn.className = 'rapid-option';
    rightBtn.className = 'rapid-option';
    
    const timerFill = document.getElementById('rapid-timer-fill');
    timerFill.style.width = '100%';
    
    let startTime = Date.now();
    if (rapidTimer) clearInterval(rapidTimer);
    
    rapidTimer = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let pct = Math.max(0, 100 - (elapsed / rapidDuration) * 100);
        timerFill.style.width = `${pct}%`;
        
        if (elapsed >= rapidDuration) {
            clearInterval(rapidTimer);
            rapidIndex++;
            showRapidDuel();
        }
    }, 30);
}

function selectRapidOption(side) {
    playSFX('click');
    const leftBtn = document.getElementById('rapid-opt-left');
    const rightBtn = document.getElementById('rapid-opt-right');
    
    if (side === 'left') {
        leftBtn.classList.add('active-left');
    } else {
        rightBtn.classList.add('active-right');
    }
    
    clearInterval(rapidTimer);
    setTimeout(() => {
        rapidIndex++;
        showRapidDuel();
    }, 400);
}

// ==========================================
// SCENE 8 - FRIENDSHIP AWARDS
// ==========================================
const awardsData = [
    { icon: '🏆', title: 'Best Partner In Crime', desc: 'Authorized to execute plans, initiate chaotic adventures, and support terrible life choices.' },
    { icon: '🎂', title: 'Professional Cake Eater', desc: 'Officially certified to consume the largest slice of birthday cake with zero regrets.' },
    { icon: '🏆', title: 'Certified Legend', desc: 'Highest tier of loyalty. Officially verified to never sell out secrets or embarrassments.' },
    { icon: '⚡', title: 'Mood Booster', desc: 'Special trait: Instantly converting depressive overthinking into high-vibe laughing fits.' },
    { icon: '❤️', title: 'Lifetime Friendship Award', desc: 'The grand prize. Good for an infinite duration of support, roastings, and high-fives.' }
];

let hasAwardsUnlocked = false;

function triggerAwardsUnlocks() {
    if (hasAwardsUnlocked) return;
    hasAwardsUnlocked = true;
    
    const container = document.getElementById('awards-container');
    container.innerHTML = '';
    
    awardsData.forEach((award, idx) => {
        const card = document.createElement('div');
        card.className = 'award-card';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'award-icon';
        iconDiv.innerText = award.icon;
        
        const titleH3 = document.createElement('h3');
        titleH3.className = 'award-title';
        titleH3.innerText = award.title;
        
        const descP = document.createElement('p');
        descP.className = 'award-desc';
        descP.innerText = award.desc;
        
        card.appendChild(iconDiv);
        card.appendChild(titleH3);
        card.appendChild(descP);
        container.appendChild(card);
        
        setTimeout(() => {
            if (currentSceneIndex !== 7) return;
            card.classList.add('unlocked');
            playSFX('unlock');
            
            if (idx === awardsData.length - 1) {
                setTimeout(() => {
                    document.getElementById('btn-awards-next').style.display = 'inline-flex';
                }, 1000);
            }
        }, idx * 1200);
    });
}

// ==========================================
// SCENE 9 - MESSAGE FROM HEART
// ==========================================
const heartLetterText = `Happy Birthday Swathi! 🎂

Bro,

It feels unbelievable how many years have passed since we first met.

We've shared memories, inside jokes, crazy adventures, and countless laughs.

No matter where life takes us, this friendship will always remain special.

Thank you for being part of the best moments of my life.

🤝❤️`;

let hasTypewriterRun = false;

function triggerTypewriter() {
    if (hasTypewriterRun) return;
    hasTypewriterRun = true;
    
    const container = document.getElementById('typewriter-message');
    container.innerHTML = '';
    
    const textNode = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'cursor-blink';
    
    container.appendChild(textNode);
    container.appendChild(cursor);
    
    let charIndex = 0;
    const speed = 40;
    
    function type() {
        if (currentSceneIndex !== 8) return;
        
        if (charIndex < heartLetterText.length) {
            textNode.textContent += heartLetterText.charAt(charIndex);
            charIndex++;
            if (charIndex % 3 === 0 && Math.random() > 0.4) {
                playSFX('click');
            }
            setTimeout(type, speed);
        } else {
            cursor.style.display = 'none';
            setTimeout(() => {
                const nextBtn = document.getElementById('btn-message-next');
                nextBtn.style.display = 'inline-flex';
                playSFX('success');
            }, 800);
        }
    }
    
    type();
}

// ==========================================
// SCENE 10 - FRIENDSHIP STATISTICS COUNTERS
// ==========================================
const statsData = [
    { target: 3, label: 'Years Together', suffix: '+' },
    { target: 500, label: 'Photos Taken', suffix: '+' },
    { target: 99999, label: 'Laughs Shared', suffix: 'k+', isInfinity: true },
    { target: 120, label: 'Cake Slices Eaten 🍰', suffix: '+' },
    { target: 100, label: 'Friendship Level', suffix: '% (LEGENDARY)' }
];

let hasStatsAnimated = false;

function triggerStatsCounter() {
    if (hasStatsAnimated) return;
    hasStatsAnimated = true;
    
    const container = document.getElementById('stats-container');
    container.innerHTML = '';
    
    statsData.forEach((stat) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        const numDiv = document.createElement('div');
        numDiv.className = 'stat-number';
        numDiv.innerText = '0';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'stat-label';
        labelDiv.innerText = stat.label;
        
        card.appendChild(numDiv);
        card.appendChild(labelDiv);
        container.appendChild(card);
        
        let count = 0;
        let duration = 2000;
        let start = Date.now();
        
        function updateCounter() {
            let elapsed = Date.now() - start;
            let progress = Math.min(1, elapsed / duration);
            let easedProgress = progress * (2 - progress);
            
            if (stat.isInfinity) {
                numDiv.innerText = '∞';
                return;
            }
            
            let val = Math.floor(easedProgress * stat.target);
            numDiv.innerText = val + stat.suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                numDiv.innerText = (stat.isInfinity ? '∞' : stat.target) + stat.suffix;
            }
        }
        
        updateCounter();
    });
}

// ==========================================
// SCENE 11 - FINAL CELEBRATION (Fireworks Engine)
// ==========================================
let fireworksCanvasInitialized = false;
let fireworksLoopId = null;
let fireworks = [];
let particles = [];

function initFireworksEngine() {
    if (fireworksCanvasInitialized) return;
    fireworksCanvasInitialized = true;
    
    const canvas = document.getElementById('canvas-fireworks');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    
    class Firework {
        constructor(sx, sy, tx, ty) {
            this.x = sx;
            this.y = sy;
            this.sx = sx;
            this.sy = sy;
            this.tx = tx;
            this.ty = ty;
            this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
            this.distanceTraveled = 0;
            this.coordinates = [];
            this.coordinateCount = 3;
            while (this.coordinateCount--) {
                this.coordinates.push([this.x, this.y]);
            }
            this.angle = Math.atan2(ty - sy, tx - sx);
            this.speed = 2;
            this.acceleration = 1.05;
            this.brightness = Math.random() * 50 + 50;
            this.targetRadius = 1;
        }
        
        update(index) {
            this.coordinates.pop();
            this.coordinates.unshift([this.x, this.y]);
            
            if (this.targetRadius < 8) {
                this.targetRadius += 0.3;
            } else {
                this.targetRadius = 1;
            }
            
            this.speed *= this.acceleration;
            
            let vx = Math.cos(this.angle) * this.speed;
            let vy = Math.sin(this.angle) * this.speed + 0.1;
            this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);
            
            if (this.distanceTraveled >= this.distanceToTarget) {
                playSFX('success');
                createParticles(this.tx, this.ty);
                fireworks.splice(index, 1);
            } else {
                this.x += vx;
                this.y += vy;
            }
        }
        
        draw() {
            ctx.beginPath();
            ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, ${this.brightness}%)`;
            ctx.stroke();
        }
    }
    
    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.coordinates = [];
            this.coordinateCount = 5;
            while (this.coordinateCount--) {
                this.coordinates.push([this.x, this.y]);
            }
            this.angle = Math.random() * Math.PI * 2;
            this.speed = Math.random() * 10 + 1;
            this.friction = 0.95;
            this.gravity = 1;
            this.hue = Math.random() * 360;
            this.brightness = Math.random() * 80 + 50;
            this.alpha = 1;
            this.decay = Math.random() * 0.03 + 0.01;
        }
        
        update(index) {
            this.coordinates.pop();
            this.coordinates.unshift([this.x, this.y]);
            this.speed *= this.friction;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed + this.gravity;
            this.alpha -= this.decay;
            
            if (this.alpha <= this.decay) {
                particles.splice(index, 1);
            }
        }
        
        draw() {
            ctx.beginPath();
            ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
            ctx.stroke();
        }
    }
    
    function calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }
    
    function createParticles(x, y) {
        let pCount = 50;
        while (pCount--) {
            particles.push(new Particle(x, y));
        }
    }
    
    function loop() {
        if (currentSceneIndex !== 10) {
            cancelAnimationFrame(fireworksLoopId);
            fireworksCanvasInitialized = false;
            return;
        }
        
        fireworksLoopId = requestAnimationFrame(loop);
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'lighter';
        
        let i = fireworks.length;
        while (i--) {
            fireworks[i].draw();
            fireworks[i].update(i);
        }
        
        let j = particles.length;
        while (j--) {
            particles[j].draw();
            particles[j].update(j);
        }
        
        if (Math.random() < 0.04) {
            launchRandomShell();
        }
    }
    
    function launchRandomShell() {
        let startX = canvas.width / 2 + (Math.random() * 200 - 100);
        let startY = canvas.height;
        let targetX = Math.random() * canvas.width;
        let targetY = Math.random() * (canvas.height / 2);
        fireworks.push(new Firework(startX, startY, targetX, targetY));
    }
    
    setInterval(() => {
        if (currentSceneIndex === 10) {
            spawnCelebrationEmoji();
        }
    }, 1500);
    
    loop();
}

function triggerMassiveFireworks() {
    playSFX('unlock');
    const canvas = document.getElementById('canvas-fireworks');
    if (!canvas) return;
    
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            let startX = canvas.width / 2;
            let startY = canvas.height;
            let targetX = Math.random() * canvas.width;
            let targetY = Math.random() * (canvas.height * 0.6);
            fireworks.push(new Firework(startX, startY, targetX, targetY));
        }, i * 200);
    }
    
    for (let i = 0; i < 6; i++) {
        setTimeout(spawnCelebrationEmoji, i * 150);
    }
}

const celebrationEmojis = ['🤝', '❤️', '🎉', '🥂', '🔥', '🏆', '🍕', '🍰', '🎂', '😎'];

function spawnCelebrationEmoji() {
    const emoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.innerText = emoji;
    el.style.left = `${Math.random() * 80 + 10}vw`;
    el.style.setProperty('--drift', `${Math.random() * 200 - 100}px`);
    document.body.appendChild(el);
    
    setTimeout(() => {
        el.remove();
    }, 4000);
}


