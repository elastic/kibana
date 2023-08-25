/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { Counter } from './counter';

export class CounterService {
  private readonly counters = new Map<string, Counter>();

  public createCounter(key: string): Counter {
    if (this.counters.get(key)) {
      throw new Error(`Metric counter for "${key}" already exists`);
    }

    const counter = new Counter();
    this.counters.set(key, counter);
    return counter;
  }

  public initialCounter(): JsonObject {
    const jsonObject: Record<string, number> = {};
    this.counters.forEach((val: Counter, key: string) => {
      jsonObject[key] = val.initialCount();
    });

    return jsonObject;
  }

  public reset() {
    this.counters.forEach((val: Counter) => {
      val.reset();
    });
  }

  public increment(key: string) {
    if (!this.counters.get(key)) {
      throw new Error(`Metric counter for "${key}" does not exist and cannot be incremented`);
    }

    this.counters.get(key)?.increment();
  }

  public toJson(): JsonObject {
    const jsonObject: Record<string, number> = {};
    this.counters.forEach((val: Counter, key: string) => {
      jsonObject[key] = val.get();
    });

    return jsonObject;
  }
}
