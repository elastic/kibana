/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum IN_MEMORY_METRICS {
  ACTION_EXECUTIONS = 'actionExecutions',
  ACTION_FAILURES = 'actionFailures',
}

const inMemoryMetrics: Record<IN_MEMORY_METRICS, number | null> = {
  [IN_MEMORY_METRICS.ACTION_EXECUTIONS]: 0,
  [IN_MEMORY_METRICS.ACTION_FAILURES]: 0,
};

export function incrementInMemoryMetric(metric: IN_MEMORY_METRICS) {
  if (!inMemoryMetrics.hasOwnProperty(metric)) {
    return;
  }

  if (inMemoryMetrics[metric] === null) {
    return;
  }

  if ((inMemoryMetrics[metric] as number) >= Number.MAX_SAFE_INTEGER) {
    inMemoryMetrics[metric] = null;
  } else {
    (inMemoryMetrics[metric] as number)++;
  }
}

export function getInMemoryMetric(metric: IN_MEMORY_METRICS) {
  return inMemoryMetrics[metric];
}

export function getAllInMemoryMetrics() {
  return inMemoryMetrics;
}
