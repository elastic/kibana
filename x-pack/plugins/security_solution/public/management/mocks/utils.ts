/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DeferredInterface<T = void> {
  promise: Promise<T>;
  resolve: (data: T) => void;
  reject: (e: Error) => void;
}

export const getDeferred = function <T = void>(): DeferredInterface<T> {
  let resolve: DeferredInterface<T>['resolve'];
  let reject: DeferredInterface<T>['reject'];

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  // @ts-ignore
  return { promise, resolve, reject };
};
