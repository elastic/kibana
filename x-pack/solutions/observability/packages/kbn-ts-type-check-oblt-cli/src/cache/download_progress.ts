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

// How often to emit a plain-text progress line in non-TTY environments.
const LOG_PROGRESS_INTERVAL_MS = 5_000;

/**
 * Returns true when stdout is an interactive terminal that can render progress
 * bars. False when stdout is piped (e.g. agents, CI redirects) — in that case
 * the caller should emit plain log lines instead.
 *
 * Note: this is process.stdout.isTTY, not process.env.isTTY.
 */
function isInteractiveTty(): boolean {
  return Boolean(process.stdout.isTTY);
}

/**
 * Creates a cli-progress bar for the extraction phase.
 * Returns an `update(n)` function to call with the running entry count and a
 * `stop()` to call on completion. Both are no-ops on CI.
 *
 * In non-TTY environments (e.g. agents), emits periodic log lines via `logInfo`
 * instead of rendering a progress bar.
 */
export const createExtractionProgressBar = (
  total: number,
  logInfo?: (msg: string) => void
): { update: (extracted: number) => void; stop: () => void } => {
  if (total === 0) {
    return { update: () => {}, stop: () => {} };
  }

  if (!isInteractiveTty() || isCiEnvironment()) {
    let lastLogTime = Date.now();

    return {
      update: (extracted: number) => {
        const now = Date.now();
        if (logInfo && now - lastLogTime >= LOG_PROGRESS_INTERVAL_MS) {
          lastLogTime = now;
          const pct = Math.round((extracted / total) * 100);
          logInfo(`[Cache] Extracting: ${extracted} / ${total} files (${pct}%)`);
        }
      },
      stop: () => {},
    };
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
 *
 * In non-TTY environments (e.g. agents), emits periodic log lines via `logInfo`
 * instead of rendering a progress bar.
 */
export const createProjectRestoreProgressBar = (
  total: number,
  logInfo?: (msg: string) => void
): { increment: () => void; stop: () => void } => {
  if (total === 0) {
    return { increment: () => {}, stop: () => {} };
  }

  if (!isInteractiveTty() || isCiEnvironment()) {
    let count = 0;
    let lastLogTime = Date.now();

    return {
      increment: () => {
        count++;
        const now = Date.now();
        if (logInfo && now - lastLogTime >= LOG_PROGRESS_INTERVAL_MS) {
          lastLogTime = now;
          logInfo(`[Cache] Restoring projects: ${count} / ${total}`);
        }
      },
      stop: () => {},
    };
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
 *
 * In non-TTY environments (e.g. agents), emits periodic log lines via `logInfo`
 * instead of rendering a progress bar.
 */
export const createDownloadProgressBar = (
  contentLength: number | undefined,
  logInfo?: (msg: string) => void
): { meter: Transform; stop: () => void } => {
  const total = contentLength ?? 0;

  if (!isInteractiveTty() || isCiEnvironment()) {
    // Non-TTY or CI: emit periodic log lines rather than an in-place bar.
    let bytesReceived = 0;
    let lastLogTime = Date.now();
    let lastLogBytes = 0;

    const meter = new Transform({
      transform(chunk, _encoding, callback) {
        bytesReceived += chunk.length;

        if (logInfo) {
          const now = Date.now();
          const elapsedMs = now - lastLogTime;

          if (elapsedMs >= LOG_PROGRESS_INTERVAL_MS) {
            const speed =
              elapsedMs > 0 ? Math.round(((bytesReceived - lastLogBytes) / elapsedMs) * 1000) : 0;
            lastLogTime = now;
            lastLogBytes = bytesReceived;

            const received = formatBytes(bytesReceived);
            const speedStr = speed > 0 ? ` at ${formatBytes(speed)}/s` : '';
            const progress = total
              ? `${received} / ${formatBytes(total)} (${Math.round(
                  (bytesReceived / total) * 100
                )}%)`
              : received;

            logInfo(`[Cache] Downloading: ${progress}${speedStr}`);
          }
        }

        callback(null, chunk);
      },
    });

    return { meter, stop: () => {} };
  }

  // When content-length is known show a proper progress bar with percentage.
  // When unknown (e.g. selective restore streamed on-the-fly) show only
  // bytes-received and speed so the display is never falsely at 100%.
  const format = total
    ? ' Downloading [{bar}] {percentage}% | {received}/{size} | {speed}/s'
    : ' Downloading {received} | {speed}/s';

  const bar = new SingleBar({ barsize: 30, format, hideCursor: true, clearOnComplete: true });

  bar.start(total || 1, 0, {
    received: formatBytes(0),
    size: total ? formatBytes(total) : '?',
    speed: '?',
  });

  let bytesReceived = 0;
  let lastUpdate = Date.now();
  let lastBytes = 0;

  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      bytesReceived += chunk.length;

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

      callback(null, chunk);
    },
  });

  const stop = () => bar.stop();

  return { meter, stop };
};
