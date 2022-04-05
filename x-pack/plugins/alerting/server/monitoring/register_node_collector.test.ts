/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { monitoringCollectionMock } from '../../../monitoring_collection/server/mocks';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { Metric } from '../../../monitoring_collection/server';
import { registerNodeCollector } from './register_node_collector';
import { NodeRulesMetric } from './types';
import { InMemoryMetrics, IN_MEMORY_METRICS } from '.';

jest.mock('./in_memory_metrics');

describe('registerNodeCollector()', () => {
  const monitoringCollection = monitoringCollectionMock.createSetup();
  const logger = loggingSystemMock.createLogger();
  const inMemoryMetrics = new InMemoryMetrics(logger);

  afterEach(() => {
    (inMemoryMetrics.getInMemoryMetric as jest.Mock).mockClear();
  });

  it('should get in memory rule metrics', async () => {
    const metrics: Record<string, Metric<unknown>> = {};
    monitoringCollection.registerMetric.mockImplementation((metric) => {
      metrics[metric.type] = metric;
    });
    registerNodeCollector({ monitoringCollection, inMemoryMetrics });

    const metricTypes = Object.keys(metrics);
    expect(metricTypes.length).toBe(1);
    expect(metricTypes[0]).toBe('node_rules');

    (inMemoryMetrics.getInMemoryMetric as jest.Mock).mockImplementation((metric) => {
      switch (metric) {
        case IN_MEMORY_METRICS.RULE_FAILURES:
          return 2;
        case IN_MEMORY_METRICS.RULE_EXECUTIONS:
          return 10;
        case IN_MEMORY_METRICS.RULE_TIMEOUTS:
          return 1;
      }
    });

    const result = (await metrics.node_rules.fetch()) as NodeRulesMetric;
    expect(result).toStrictEqual({ failures: 2, executions: 10, timeouts: 1 });
  });
});
