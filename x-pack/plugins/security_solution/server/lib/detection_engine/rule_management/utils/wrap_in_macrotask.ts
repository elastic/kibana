/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wraps an async function into a macro task to prevent blocking event loop.
 *
 * Node.js is built upon an event loop and has definition of micro and macro tasks.
 *
 * Macro tasks are functions scheduled via setTimeout, setImmediate and etc to be
 * executed in event loop. Macro tasks scheduled in the current event loop cycle
 * will be executed in the next cycle giving a chance to the other macro tasks to
 * be executed.
 *
 * Micro tasks are also functions by scheduled via a Promise. Micro tasks get added
 * to a micro task queue which must be depleted before event loop can move to
 * the next cycle. It means that any microtask scheduled in the current event loop
 * cycle will be executed in the same cycle. Potentially it can lead to blocking
 * the event loop for longer periods or even infinitely.
 *
 * For more details check the following sources
 * - [MDN Microtask guide](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
 * - [MDN Microtask guide in_depth](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth)
 * - [What the heck is the event loop anyway? | Philip Roberts | JSConf EU](https://www.youtube.com/watch?v=8aGhZQkoFbQ)
 *
 *
 * @param actionFn function returning a promise
 * @returns a wrapped function
 */
export function wrapInMacrotask<Args extends unknown[], R>(
  actionFn: (...args: Args) => Promise<R>
): (...args: Args) => Promise<R> {
  return (...args: Args) =>
    new Promise<R>((resolve, reject) => {
      setImmediate(() => {
        try {
          resolve(actionFn(...args));
        } catch (e) {
          reject(e);
        }
      });
    });
}
