/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Caches the result of a function call
 *
 * @param fn the function to be invoked
 *
 * @returns A function that will invoke the given function on its first invocation,
 * and then simply return the result on subsequent calls
 */
export const cache = <T>(fn: () => T): (() => T) => {
  let result: T | null = null;

  return () => {
    if (result === null) {
      result = fn();
    }
    return result;
  };
};
