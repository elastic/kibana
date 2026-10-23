/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KEYBOARD_STEP_MS = 5_000;
export const KEYBOARD_LARGE_STEP_MS = 30_000;

/**
 * Maps a key to the offset a slider should move to, or `undefined` for keys it does not handle.
 * The result is clamped to the recording.
 */
export const offsetForKey = ({
  key,
  offsetMs,
  durationMs,
}: {
  key: string;
  offsetMs: number;
  durationMs: number;
}): number | undefined => {
  let target: number | undefined;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      target = offsetMs + KEYBOARD_STEP_MS;
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      target = offsetMs - KEYBOARD_STEP_MS;
      break;
    case 'PageUp':
      target = offsetMs + KEYBOARD_LARGE_STEP_MS;
      break;
    case 'PageDown':
      target = offsetMs - KEYBOARD_LARGE_STEP_MS;
      break;
    case 'Home':
      target = 0;
      break;
    case 'End':
      target = durationMs;
      break;
    default:
      return undefined;
  }
  return Math.min(Math.max(target, 0), durationMs);
};
