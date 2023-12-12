/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (val: T) => void;
  reject: (err: Error) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolver: (val: T) => void;
  let rejecter: (err: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolver = res;
    rejecter = rej;
  });

  function resolve(val: T) {
    resolver(val);
  }

  function reject(err: Error) {
    rejecter(err);
  }

  return { promise, resolve, reject };
}
