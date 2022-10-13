/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ResolvablePromise<T> = Promise<T> & {
  doResolve: (value: unknown) => void;
  doReject: (reason?: any) => void;
};

export function getResolvablePromise<T>(): ResolvablePromise<T> {
  const resolvablePromise: Partial<ResolvablePromise<T>> = {};

  Object.assign(
    resolvablePromise,
    new Promise((resolve, reject) => {
      resolvablePromise.doResolve = resolve;
      resolvablePromise.doReject = reject;
    })
  );

  return resolvablePromise as ResolvablePromise<T>;
}
