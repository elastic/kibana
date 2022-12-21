/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InMemoryMetrics, IN_MEMORY_METRICS } from '.';
import { loggingSystemMock } from '@kbn/core/server/mocks';

describe('inMemoryMetrics', () => {
  const logger = loggingSystemMock.createLogger();
  const inMemoryMetrics = new InMemoryMetrics(logger);

  beforeEach(() => {
    const all = inMemoryMetrics.getAllInMemoryMetrics();
    for (const key of Object.keys(all)) {
      all[key as IN_MEMORY_METRICS] = 0;
    }
  });

  it('should increment', () => {
    inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS)).toBe(1);
  });

  it('should set to null if incrementing will set over the max integer', () => {
    const all = inMemoryMetrics.getAllInMemoryMetrics();
    all[IN_MEMORY_METRICS.RULE_EXECUTIONS] = Number.MAX_SAFE_INTEGER;
    inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS)).toBe(null);
    expect(logger.info).toHaveBeenCalledWith(
      `Metric ${IN_MEMORY_METRICS.RULE_EXECUTIONS} has reached the max safe integer value and will no longer be used, skipping increment.`
    );
    inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS)).toBe(null);
    expect(logger.info).toHaveBeenCalledWith(
      `Metric ${IN_MEMORY_METRICS.RULE_EXECUTIONS} is null because the counter ran over the max safe integer value, skipping increment.`
    );
  });
});
