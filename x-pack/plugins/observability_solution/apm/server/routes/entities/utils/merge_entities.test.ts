/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntities } from './merge_entities';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';

describe('mergeEntities', () => {
  it('modifies one service', () => {
    const entities = [
      {
        serviceName: 'service-1',
        environment: 'test',
        agentName: 'nodejs' as AgentName as AgentName,
        signalTypes: ['metrics', 'logs'],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name', 'service.environment'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName as AgentName,
        signalTypes: ['metrics', 'logs'],
        environments: ['test'],
        latestTimestamp: '2024-06-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
            logErrorRate: null,
            logRate: 1,
            throughput: 0,
          },
        ],
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
    ]);
  });

  it('joins two service with the same name ', () => {
    const entities = [
      {
        serviceName: 'service-1',
        environment: 'env-service-1',
        agentName: 'nodejs' as AgentName as AgentName,
        signalTypes: ['foo'],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name', 'service.environment'],
          id: 'service-1:env-service-1',
          hasLogMetrics: true,
        },
      },
      {
        serviceName: 'service-1',
        environment: 'env-service-2',
        agentName: 'nodejs' as AgentName as AgentName,
        signalTypes: ['bar'],
        entity: {
          latestTimestamp: '2024-03-05T10:34:40.810Z',
          metrics: {
            logRate: 10,
            logErrorRate: 10,
            throughput: 10,
            failedTransactionRate: 10,
            latency: 10,
          },
          identityFields: ['service.name', 'service.environment'],
          id: 'apm-only-1:synthtrace-env-2',
          hasLogMetrics: true,
        },
      },
      {
        serviceName: 'service-2',
        environment: 'env-service-3',
        agentName: 'java' as AgentName,
        signalTypes: ['baz'],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 15,
            logErrorRate: 15,
            throughput: 15,
            failedTransactionRate: 15,
            latency: 15,
          },
          identityFields: ['service.name', 'service.environment'],
          id: 'service-2:env-service-3',
          hasLogMetrics: true,
        },
      },
      {
        serviceName: 'service-2',
        environment: 'env-service-4',
        agentName: 'java' as AgentName,
        signalTypes: ['baz'],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 5,
            logErrorRate: 5,
            throughput: 5,
            failedTransactionRate: 5,
            latency: 5,
          },
          identityFields: ['service.name', 'service.environment'],
          id: 'service-2:env-service-3',
          hasLogMetrics: true,
        },
      },
    ];

    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        signalTypes: ['foo', 'bar'],
        environments: ['env-service-1', 'env-service-2'],
        latestTimestamp: '2024-03-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
            logErrorRate: null,
            logRate: 1,
            throughput: 0,
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
        signalTypes: ['baz'],
        environments: ['env-service-3', 'env-service-4'],
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
    ]);
  });
  it('handles duplicate environments and data streams', () => {
    const entities = [
      {
        serviceName: 'service-1',
        environment: 'test',
        agentName: 'nodejs' as AgentName,
        signalTypes: ['metrics', 'logs'],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 5,
            logErrorRate: 5,
            throughput: 5,
            failedTransactionRate: 5,
            latency: 5,
          },
          identityFields: ['service.name', 'service.environment'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
      {
        serviceName: 'service-1',
        environment: 'test',
        agentName: 'nodejs' as AgentName,
        signalTypes: ['metrics', 'logs'],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 10,
            logErrorRate: 10,
            throughput: 10,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name', 'service.environment'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
      {
        serviceName: 'service-1',
        environment: 'prod',
        agentName: 'nodejs' as AgentName,
        signalTypes: ['foo'],
        entity: {
          latestTimestamp: '2024-23-05T10:34:40.810Z',
          metrics: {
            logRate: 0.333,
            logErrorRate: 0.333,
            throughput: 0.333,
            failedTransactionRate: 0.333,
            latency: 0.333,
          },
          identityFields: ['service.name', 'service.environment'],
          id: 'service-1:prod',
          hasLogMetrics: true,
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        signalTypes: ['metrics', 'logs', 'foo'],
        environments: ['test', 'prod'],
        latestTimestamp: '2024-23-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 5,
            latency: 5,
            logErrorRate: 5,
            logRate: 5,
            throughput: 5,
          },
          {
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
            logErrorRate: 10,
            logRate: 10,
            throughput: 10,
          },
          {
            failedTransactionRate: 0.333,
            latency: 0.333,
            logErrorRate: 0.333,
            logRate: 0.333,
            throughput: 0.333,
          },
        ],
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
    ]);
  });
  it('handles null environment', () => {
    const entity = [
      {
        serviceName: 'service-1',
        environment: undefined,
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
    ];
    const entityResult = mergeEntities({ entities: entity });
    expect(entityResult).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        environments: [],
        latestTimestamp: '2024-06-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
            logErrorRate: null,
            logRate: 1,
            throughput: 0,
          },
        ],
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
    ]);

    const entities = [
      {
        serviceName: 'service-1',
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
      {
        serviceName: 'service-1',
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        environments: [],
        latestTimestamp: '2024-06-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
            logErrorRate: null,
            logRate: 1,
            throughput: 0,
          },
          {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
        ],
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
    ]);
  });

  it('handles undefined environment', () => {
    const entity = [
      {
        serviceName: 'service-1',
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
    ];
    const entityResult = mergeEntities({ entities: entity });
    expect(entityResult).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        environments: [],
        latestTimestamp: '2024-06-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
            logErrorRate: null,
            logRate: 1,
            throughput: 0,
          },
        ],
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
    ]);

    const entities = [
      {
        serviceName: 'service-1',
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
      {
        serviceName: 'service-1',
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        entity: {
          latestTimestamp: '2024-06-05T10:34:40.810Z',
          metrics: {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
          identityFields: ['service.name'],
          id: 'service-1:test',
          hasLogMetrics: true,
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        signalTypes: [],
        environments: [],
        latestTimestamp: '2024-06-05T10:34:40.810Z',
        metrics: [
          {
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
            logErrorRate: null,
            logRate: 1,
            throughput: 0,
          },
          {
            logRate: 1,
            logErrorRate: null,
            throughput: 0,
            failedTransactionRate: 0.3333333333333333,
            latency: 10,
          },
        ],
        serviceName: 'service-1',
        hasLogMetrics: true,
      },
    ]);
  });
});
