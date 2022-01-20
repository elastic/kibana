/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum IN_MEMORY_METRICS {
  RULE_EXECUTIONS = 'ruleExecutions',
  RULE_FAILURES = 'ruleFailures',
}

const inMemoryMetrics: Record<IN_MEMORY_METRICS, number> = {
  [IN_MEMORY_METRICS.RULE_EXECUTIONS]: 0,
  [IN_MEMORY_METRICS.RULE_FAILURES]: 0,
};

export function incrementInMemoryMetric(metric: IN_MEMORY_METRICS) {
  if (!inMemoryMetrics.hasOwnProperty(metric)) {
    return;
  }

  if (inMemoryMetrics[metric] === Number.MAX_VALUE) {
    inMemoryMetrics[metric] = 0;
  }
  inMemoryMetrics[metric]++;
}

export function getInMemoryMetric(metric: IN_MEMORY_METRICS) {
  return inMemoryMetrics[metric];
}

export function getAllInMemoryMetrics() {
  return inMemoryMetrics;
}
