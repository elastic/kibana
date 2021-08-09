/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Lazy } from './lazy';

export class LazyPromise<T> {
  private value: Lazy<Promise<T>>;

  constructor(fn: () => Promise<T>) {
    this.value = new Lazy<Promise<T>>(fn);
  }

  public resolve(): Promise<T> {
    return this.value.get();
  }
}
