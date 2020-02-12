/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Able to hoist a Promise's resolve and reject functions to the same scope as the Promise
 */
export function flattenedPromise<T>(): [Promise<T>, PromiseResolver<T>, PromiseRejector<T>] {
  let newResolve: PromiseResolver<T>;
  let newReject: PromiseRejector<T>;
  const promise = new Promise<T>((resolve, reject) => {
    newResolve = resolve;
    newReject = reject;
  });
  return [promise, newResolve!, newReject!];
}

type PromiseResolver<T> = (value?: T | PromiseLike<T>) => void;

type PromiseRejector<T> = (reason?: any) => void;
