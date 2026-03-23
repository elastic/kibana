/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import { SingleBar } from 'cli-progress';
import { isCiEnvironment } from './utils';

// Minimum ms between bar renders during extraction. Throttling update() calls
// to this interval prevents per-entry noise from making the ETA jump because
// each sample represents a meaningful slice of elapsed time.
const EXTRACT_RENDER_INTERVAL_MS = 250;

/**
 * Creates a cli-progress bar for the extraction phase.
 * Returns an `update(n)` function to call with the running entry count and a
 * `stop()` to call on completion. Both are no-ops on CI.
 */
export const createExtractionProgressBar = (
  total: number
): { update: (extracted: number) => void; stop: () => void } => {
  if (isCiEnvironment() || total === 0) {
    return { update: () => {}, stop: () => {} };
  }

  const bar = new SingleBar({
    barsize: 30,
    // etaBuffer: number of samples used for the rolling ETA average.
    // Higher value → smoother ETA, slower to react to sudden speed changes.
    etaBuffer: 30,
    format: ' Extracting [{bar}] {percentage}% | {value}/{total} files | {eta_formatted} remaining',
    hideCursor: true,
    clearOnComplete: true,
  });
  bar.start(total, 0);

  let lastRender = Date.now();
  let pendingValue = 0;

  return {
    update: (extracted: number) => {
      pendingValue = extracted;
      const now = Date.now();
      if (now - lastRender >= EXTRACT_RENDER_INTERVAL_MS) {
        bar.update(pendingValue);
        lastRender = now;
      }
    },
    stop: () => {
      bar.update(pendingValue);
      bar.stop();
    },
  };
};

/**
 * Creates a cli-progress bar for the per-project selective restore phase.
 * Increments by one project at a time. No-op on CI.
 */
export const createProjectRestoreProgressBar = (
  total: number
): { increment: () => void; stop: () => void } => {
  if (isCiEnvironment() || total === 0) {
    return { increment: () => {}, stop: () => {} };
  }

  const bar = new SingleBar({
    barsize: 30,
    etaBuffer: 10,
    format: ' Restoring [{bar}] {value}/{total} projects | {eta_formatted} remaining',
    hideCursor: true,
    clearOnComplete: true,
  });
  bar.start(total, 0);

  return {
    increment: () => bar.increment(),
    stop: () => bar.stop(),
  };
};

const SPEED_WINDOW_MS = 500;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Creates a passthrough Transform stream that tracks bytes received and drives
 * a `cli-progress` bar. On CI the bar is suppressed; `stop()` is always safe
 * to call regardless.
 */
export const createDownloadProgressBar = (
  contentLength: number | undefined
): { meter: Transform; stop: () => void } => {
  const total = contentLength ?? 0;
  const showBar = !isCiEnvironment();

  let bar: SingleBar | undefined;

  if (showBar) {
    // When content-length is known show a proper progress bar with percentage.
    // When unknown (e.g. selective restore streamed on-the-fly) show only
    // bytes-received and speed so the display is never falsely at 100%.
    const format = total
      ? ' Downloading [{bar}] {percentage}% | {received}/{size} | {speed}/s'
      : ' Downloading {received} | {speed}/s';

    bar = new SingleBar({ barsize: 30, format, hideCursor: true, clearOnComplete: true });

    bar.start(total || 1, 0, {
      received: formatBytes(0),
      size: total ? formatBytes(total) : '?',
      speed: '?',
    });
  }

  let bytesReceived = 0;
  let lastUpdate = Date.now();
  let lastBytes = 0;

  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      bytesReceived += chunk.length;

      if (bar) {
        const now = Date.now();
        const elapsed = now - lastUpdate;

        if (elapsed >= SPEED_WINDOW_MS) {
          const speed = Math.round(((bytesReceived - lastBytes) / elapsed) * 1000);
          lastUpdate = now;
          lastBytes = bytesReceived;

          // When total is unknown keep position at 0 — only the payload
          // tokens (received, speed) carry meaningful information.
          bar.update(total ? bytesReceived : 0, {
            received: formatBytes(bytesReceived),
            size: total ? formatBytes(total) : '?',
            speed: formatBytes(speed),
          });
        }
      }

      callback(null, chunk);
    },
  });

  const stop = () => bar?.stop();

  return { meter, stop };
};
