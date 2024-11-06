/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unlike lodash's debounce, which resolves intermediate calls with the most
 * recent value, this implementation waits to resolve intermediate calls until
 * the next invocation resolves.
 *
 * @param fn an async function
 *
 * @returns A debounced async function that resolves on the next invocation
 */
export const debounceAsync = <Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  interval: number
): ((...args: Args) => Result) => {
  let handle: ReturnType<typeof setTimeout> | undefined;
  let resolves: Array<(value?: Result) => void> = [];

  return (...args: Args): Result => {
    if (handle) {
      clearTimeout(handle);
    }

    handle = setTimeout(() => {
      const result = fn(...args);
      resolves.forEach((resolve) => resolve(result));
      resolves = [];
    }, interval);

    return new Promise((resolve) => resolves.push(resolve)) as Result;
  };
};
