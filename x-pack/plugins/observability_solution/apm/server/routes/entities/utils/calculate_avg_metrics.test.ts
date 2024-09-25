/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityMetrics, EntityDataStreamType } from '../../../../common/entities/types';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { calculateAvgMetrics, mergeMetrics } from './calculate_avg_metrics';

describe('calculateAverageMetrics', () => {
  it('calculates average metrics', () => {
    const entities = [
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: [EntityDataStreamType.METRICS, EntityDataStreamType.LOGS],
        environments: [],
        latestTimestamp: '2024-03-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 5,
            latency: 5,
            logErrorRate: 5,
            logRate: 5,
            throughput: 5,
          },
          {
            failedTransactionRate: 10,
            latency: 10,
            logErrorRate: 10,
            logRate: 10,
            throughput: 10,
          },
        ],
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
      {
        agentName: 'java' as AgentName,
        dataStreamTypes: [EntityDataStreamType.METRICS],
        environments: [],
        latestTimestamp: '2024-06-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 15,
            latency: 15,
            logErrorRate: 15,
            logRate: 15,
            throughput: 15,
          },
          {
            failedTransactionRate: 5,
            latency: 5,
            logErrorRate: 5,
            logRate: 5,
            throughput: 5,
          },
        ],
        serviceName: 'service-2',
        hasLogMetrics: true,
      },
    ];

    const result = calculateAvgMetrics(entities);

    expect(result).toEqual([
      {
        agentName: 'nodejs',
        dataStreamTypes: [EntityDataStreamType.METRICS, EntityDataStreamType.LOGS],
        environments: [],
        latestTimestamp: '2024-03-05T10:34:40.810Z',
        metrics: {
          failedTransactionRate: 7.5,
          latency: 7.5,
          logErrorRate: 7.5,
          logRate: 7.5,
          throughput: 7.5,
        },
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
      {
        agentName: 'java' as AgentName,
        dataStreamTypes: [EntityDataStreamType.METRICS],
        environments: [],
        latestTimestamp: '2024-06-05T10:34:40.810Z',
        metrics: {
          failedTransactionRate: 10,
          latency: 10,
          logErrorRate: 10,
          logRate: 10,
          throughput: 10,
        },
        serviceName: 'service-2',
        hasLogMetrics: true,
      },
    ]);
  });
  it('calculates average metrics with null', () => {
    const entities = [
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: [EntityDataStreamType.METRICS],
        environments: ['env-service-1', 'env-service-2'],
        latestTimestamp: '2024-03-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 5,
            latency: null,
            logErrorRate: 5,
            logRate: 5,
            throughput: 5,
          },
          {
            failedTransactionRate: 10,
            latency: null,
            logErrorRate: 10,
            logRate: 10,
            throughput: 10,
          },
        ],
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
    ];

    const result = calculateAvgMetrics(entities);

    expect(result).toEqual([
      {
        agentName: 'nodejs',
        dataStreamTypes: [EntityDataStreamType.METRICS],
        environments: ['env-service-1', 'env-service-2'],
        latestTimestamp: '2024-03-05T10:34:40.810Z',
        metrics: {
          failedTransactionRate: 7.5,
          logErrorRate: 7.5,
          logRate: 7.5,
          throughput: 7.5,
        },
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
    ]);
  });
});

describe('mergeMetrics', () => {
  it('merges metrics correctly', () => {
    const metrics = [
      {
        failedTransactionRate: 5,
        latency: 5,
        logErrorRate: 5,
        logRate: 5,
        throughput: 5,
      },
      {
        failedTransactionRate: 10,
        latency: 10,
        logErrorRate: 10,
        logRate: 10,
        throughput: 10,
      },
    ];

    const result = mergeMetrics(metrics);

    expect(result).toEqual({
      failedTransactionRate: [5, 10],
      latency: [5, 10],
      logErrorRate: [5, 10],
      logRate: [5, 10],
      throughput: [5, 10],
    });
  });

  it('handles empty metrics array', () => {
    const metrics: EntityMetrics[] = [];

    const result = mergeMetrics(metrics);

    expect(result).toEqual({});
  });

  it('returns metrics with zero value', () => {
    const metrics = [
      {
        failedTransactionRate: 0,
        latency: 4,
        logErrorRate: 5,
        logRate: 5,
        throughput: 5,
      },
    ];

    const result = mergeMetrics(metrics);

    expect(result).toEqual({
      failedTransactionRate: [0],
      latency: [4],
      logErrorRate: [5],
      logRate: [5],
      throughput: [5],
    });
  });

  it('does not return metrics with null', () => {
    const metrics = [
      {
        failedTransactionRate: null,
        latency: null,
        logErrorRate: 5,
        logRate: 5,
        throughput: 5,
      },
      {
        failedTransactionRate: 5,
        latency: null,
        logErrorRate: 5,
        logRate: 5,
        throughput: 5,
      },
    ];

    const result = mergeMetrics(metrics);

    expect(result).toEqual({
      failedTransactionRate: [5],
      logErrorRate: [5, 5],
      logRate: [5, 5],
      throughput: [5, 5],
    });
  });
});
