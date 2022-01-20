/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAllInMemoryMetrics,
  getInMemoryMetric,
  incrementInMemoryMetric,
  IN_MEMORY_METRICS,
} from '.';

describe('inMemoryMetrics', () => {
  beforeEach(() => {
    const all = getAllInMemoryMetrics();
    for (const key of Object.keys(all)) {
      all[key as IN_MEMORY_METRICS] = 0;
    }
  });

  it('should increment', () => {
    incrementInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(getInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS)).toBe(1);
  });

  it('should set to null if incrementing will set over the max integer', () => {
    const all = getAllInMemoryMetrics();
    all[IN_MEMORY_METRICS.RULE_EXECUTIONS] = Number.MAX_SAFE_INTEGER;
    incrementInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(getInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS)).toBe(null);
    incrementInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(getInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS)).toBe(null);
  });
});
