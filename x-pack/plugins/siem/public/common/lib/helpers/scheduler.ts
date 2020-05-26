/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleLog } from 'd3-scale';

// Types are from: https://github.com/Microsoft/TypeScript/issues/21309
// TODO: Once this is no longer an experimental web API, remove these below
// as they should be Typed by TypeScript
type RequestIdleCallbackHandle = number;
interface RequestIdleCallbackOptions {
  timeout: number;
}
interface RequestIdleCallbackDeadline {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

declare global {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: RequestIdleCallbackDeadline) => void,
      opts?: RequestIdleCallbackOptions
    ) => RequestIdleCallbackHandle;
    cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void;
  }
}

/**
 * Polyfill is from: https://developers.google.com/web/updates/2015/08/using-requestidlecallback
 * This is for Safari 12.1.2 and IE-11
 */
export const polyFillRequestIdleCallback = (
  callback: (deadline: RequestIdleCallbackDeadline) => void
) => {
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => {
        return Math.max(0, 50 - (Date.now() - start));
      },
    });
  }, 1);
};

/**
 * This is a polyfill for "requestIdleCallback" but since it is an
 * experimental web API and TypeScript does not even support the API
 * properly, I left it as is within this file as a utility for us to change
 * tune as needed instead of pushing the experimental API to all users
 * of Kibana.
 *
 * NOTE: This might become obsolete once React releases its own
 * scheduler with fibers (Concurrent React) and we would then remove
 * this and all usages. Otherwise, just remove this note
 */
export const requestIdleCallbackViaScheduler = (
  callback: (deadline: RequestIdleCallbackDeadline) => void,
  opts?: RequestIdleCallbackOptions
) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, opts);
  } else {
    polyFillRequestIdleCallback(callback);
  }
};

/**
 * Use this with any maxDelay such as
 *
 * data.map((event, i) => {
 *   const maxDelay = maxDelay(i);
 * }
 *
 * where i is within a loop of elements. You can start at 0 and go to Infinity and it
 * will clamp you at 100 milliseconds through 2000 milliseconds (2 seconds)
 * to delay a render.
 *
 * This function guarantees that your first element gets a chance to run up to
 * 100 milliseconds through the range of .range([100, 2000]).
 *
 * NOTE: ScaleLog cannot be given a zero, so the domain starting at 1
 * like so: domain([1, 100]) is intentional.
 *
 * NOTE: If you go above 25 elements this will at most return 2000 milliseconds for a
 * delayMax setting value meaning at most beyond 25 elements to display, they will take at most
 * 2 seconds to delay before show up.
 */
export const maxDelay = scaleLog().domain([1, 25]).range([100, 2000]).clamp(true);
