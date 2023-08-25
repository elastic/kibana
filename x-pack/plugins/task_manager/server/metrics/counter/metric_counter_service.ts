/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { set } from '@kbn/safer-lodash-set';
import { Counter } from './counter';

interface GenericObject {
  [key: string]: unknown;
}
export const unflattenObject = <T extends object = GenericObject>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);

export class MetricCounterService<T extends JsonObject> {
  private readonly counters = new Map<string, Counter>();
  private keys: string[];

  constructor(keys: string[]) {
    this.keys = keys;
  }

  public initialMetrics(): T {
    return this.toJson(true);
  }

  public reset() {
    this.counters.forEach((val: Counter) => {
      val.reset();
    });
  }

  public increment(key: string, namespace?: string) {
    this.initializeCountersForNamespace(namespace);
    this.counters.get(key)?.increment();
  }

  public collect(): T {
    return this.toJson();
  }

  private initializeCountersForNamespace(namespace?: string) {
    const prefix = namespace ? `${namespace}.` : '';
    for (const key of this.keys) {
      if (!this.counters.get(`${prefix}${key}`)) {
        this.counters.set(`${prefix}${key}`, new Counter());
      }
    }
  }

  private toJson(initialMetric: boolean = false): T {
    const collected: Record<string, number> = {};
    this.counters.forEach((val: Counter, key: string) => {
      collected[key] = initialMetric ? val.initialCount() : val.get();
    });

    return unflattenObject(collected);
  }
}
