/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Option, none, some, isSome } from 'fp-ts/Option';

export class Lazy<T> {
  private getter: () => T;
  private value: Option<T>;

  constructor(getter: () => T) {
    this.getter = getter;
    this.value = none;
  }

  public get(): T {
    if (isSome(this.value)) {
      return this.value.value;
    }

    const value = this.getter();
    this.value = some(value);
    return value;
  }
}
