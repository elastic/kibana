/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// inline version of https://www.npmjs.com/package/p-defer ; an object
// with .promise, .resolve(), and .reject() properties
export function createDeferred() {
  let resolver: any;
  let rejecter: any;

  function resolve(...args: any[]) {
    resolver(...args);
  }

  function reject(...args: any[]) {
    rejecter(...args);
  }

  const promise = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });

  return { promise, resolve, reject };
}
