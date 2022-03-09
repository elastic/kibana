/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { monitoringCollectionMock } from '../../../monitoring_collection/server/mocks';
import { Metric } from '../../../monitoring_collection/server';
import { registerNodeCollector } from './register_node_collector';
import { NodeActionsMetric } from './types';
import { getAllInMemoryMetrics, IN_MEMORY_METRICS } from '.';

jest.mock('./in_memory_metrics');

describe('registerNodeCollector()', () => {
  const monitoringCollection = monitoringCollectionMock.createSetup();

  afterEach(() => {
    (getAllInMemoryMetrics as jest.Mock).mockClear();
  });

  it('should get in memory action metrics', async () => {
    const metrics: Record<string, Metric<unknown>> = {};
    monitoringCollection.registerMetric.mockImplementation((metric) => {
      metrics[metric.type] = metric;
    });
    registerNodeCollector({ monitoringCollection });

    const metricTypes = Object.keys(metrics);
    expect(metricTypes.length).toBe(1);
    expect(metricTypes[0]).toBe('node_actions');

    (getAllInMemoryMetrics as jest.Mock).mockImplementation(() => {
      return {
        [IN_MEMORY_METRICS.ACTION_FAILURES]: 2,
        [IN_MEMORY_METRICS.ACTION_EXECUTIONS]: 10,
      };
    });

    const result = (await metrics.node_actions.fetch()) as NodeActionsMetric;
    expect(result).toStrictEqual({ failures: 2, executions: 10 });
  });
});
