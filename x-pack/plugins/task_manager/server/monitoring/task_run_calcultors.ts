/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import stats from 'stats-lite';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { isUndefined, countBy, mapValues } from 'lodash';

export interface AveragedStat extends JsonObject {
  mean: number;
  median: number;
}

export function calculateRunningAverage(values: number[]): AveragedStat {
  return {
    mean: Math.round(stats.mean(values)),
    median: stats.median(values),
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
 * Utility to keep track of a limited queue of values which changes over time
 * dropping older values as they slide out of the window we wish to track
 */
export function createRunningAveragedStat<T>(runningAverageWindowSize: number) {
  const queue = new Array<T>();
  return (value?: T) => {
    if (isUndefined(value)) {
      return queue;
    } else {
      if (queue.length === runningAverageWindowSize) {
        queue.shift();
      }
      queue.push(value);
      return [...queue];
    }
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
