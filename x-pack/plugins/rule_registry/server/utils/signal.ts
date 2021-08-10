/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function createSignal() {
  let resolver: () => void;

  let ready: boolean = false;

  const promise = new Promise<void>((resolve) => {
    resolver = resolve;
  });

  function wait(): Promise<void> {
    return promise.then(() => {
      ready = true;
    });
  }

  function complete() {
    resolver();
  }

  return { wait, complete, isReady: () => ready };
}
