/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stats from 'stats-lite';
import { JsonObject } from '@kbn/utility-types';
import { isUndefined, countBy, mapValues } from 'lodash';

export interface AveragedStat extends JsonObject {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export function calculateRunningAverage(values: number[]): AveragedStat {
  return {
    p50: stats.percentile(values, 0.5),
    p90: stats.percentile(values, 0.9),
    p95: stats.percentile(values, 0.95),
    p99: stats.percentile(values, 0.99),
  };
}

/**
 * Calculate the frequency of each term in a list of terms.
 * @param values
 */
export function calculateFrequency<T>(values: T[]): JsonObject {
  return values.length
    ? mapValues(countBy(values), (count) => Math.round((count * 100) / values.length))
    : {};
}

/**
 * Utility to keep track of a bounded array of values which changes over time
 * dropping older values as they slide out of the window we wish to track
 */
export function createRunningAveragedStat<T>(runningAverageWindowSize: number) {
  const list = new Array<T>();
  return (value?: T) => {
    if (!isUndefined(value)) {
      if (list.length === runningAverageWindowSize) {
        list.shift();
      }
      list.push(value);
    }
    // clone list to ensure it isn't mutated externally
    return [...list];
  };
}

export function createMapOfRunningAveragedStats<T>(runningAverageWindowSize: number) {
  const mappedQueue: Record<string, (value?: T) => T[]> = {};
  const asRecordOfValues = () => mapValues(mappedQueue, (queue) => queue());
  return (key?: string, value?: T) => {
    if (!isUndefined(key)) {
      mappedQueue[key] = mappedQueue[key] ?? createRunningAveragedStat(runningAverageWindowSize);
      mappedQueue[key](value);
    }
    return asRecordOfValues();
  };
}
