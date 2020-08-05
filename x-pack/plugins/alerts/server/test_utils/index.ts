/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Resolvable<T> {
  resolve: (arg: T) => void;
}

/**
 * Creates a promise which can be resolved externally, useful for
 * coordinating async tests.
 */
export function resolvable<T>(): Promise<T> & Resolvable<T> {
  let resolve: (arg: T) => void;
  return Object.assign(new Promise<T>((r) => (resolve = r)), {
    resolve(arg: T) {
      return setTimeout(() => resolve(arg), 0);
    },
  });
}
