/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ReadySignal<T = void> {
  wait(): Promise<T>;
  signal(value: T): void;
}

export function createReadySignal<T>(): ReadySignal<T> {
  let resolver: (value: T) => void;

  const promise = new Promise<T>((resolve) => {
    resolver = resolve;
  });

  async function wait(): Promise<T> {
    return await promise;
  }

  function signal(value: T) {
    resolver(value);
  }

  return { wait, signal };
}
