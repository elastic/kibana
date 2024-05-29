/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntities } from './merge_entities';

describe('mergeEntities', () => {
  const services = [
    {
      name: 'apm-only-1',
      environment: 'apm-only-1-env',
      agent: { name: ['go'] },
      data_stream: { type: ['bar'] },
      entity: {
        indexPatterns: ['bar'],
        latestTimestamp: '2024-05-27T14:12:26.537Z',
        metric: {
          logRatePerMinute: null,
          latency: 500,
          logErrorRate: null,
          throughput: 0.5,
          failedTransactionRate: 0.5,
        },
        identity: {
          service: { environment: 'apm-only-1-env', name: 'apm-only-1' },
        },
        id: 'apm-only-0:apm-only-1-env',
        definitionId: 'apm-services',
      },
    },
  ];

  it('modifies one service', () => {
    const services = [
      {
        name: 'apm-only-1',
        environment: 'apm-only-1-env',
        agent: { name: ['go'] },
        data_stream: { type: ['bar'] },
        entity: {
          indexPatterns: ['bar'],
          latestTimestamp: '2024-05-27T14:12:26.537Z',
          metric: {
            logRatePerMinute: null,
            latency: 500,
            logErrorRate: null,
            throughput: 0.5,
            failedTransactionRate: 0.5,
          },
          identity: {
            service: { environment: 'apm-only-1-env', name: 'apm-only-1' },
          },
          id: 'apm-only-0:apm-only-1-env',
          definitionId: 'apm-services',
        },
      },
    ];

    const result = mergeEntities({ entities: services });
    expect(result).toEqual([
      {
        data_stream: { type: ['bar'] },
        agent: { name: ['go'] },
        entity: {
          metric: {
            latency: [500],
            throughput: [0.5],
            failedTransactionRate: [0.5],
            logRatePerMinute: [null],
            logErrorRate: [null],
          },
        },
        environments: ['apm-only-1-env'],
        name: 'apm-only-1',
      },
    ]);
  });

  it('merges services by name', () => {
    const services = [
      {
        name: 'apm-only-1',
        environment: 'apm-only-1-env',
        agent: { name: ['go'] },
        data_stream: { type: ['bar'] },
        entity: {
          indexPatterns: ['bar'],
          latestTimestamp: '2024-05-27T14:12:26.537Z',
          metric: {
            logRatePerMinute: null,
            latency: 500,
            logErrorRate: null,
            throughput: 0.5,
            failedTransactionRate: 0.5,
          },
          identity: {
            service: { environment: 'apm-only-1-env', name: 'apm-only-1' },
          },
          id: 'apm-only-0:apm-only-1-env',
          definitionId: 'apm-services',
        },
      },
      {
        name: 'apm-only-1',
        environment: 'apm-only-1-env',
        agent: { name: ['go'] },
        data_stream: { type: ['bar'] },
        entity: {
          indexPatterns: ['bar'],
          latestTimestamp: '2024-05-27T14:12:26.537Z',
          metric: {
            logRatePerMinute: null,
            latency: 500,
            logErrorRate: null,
            throughput: 0.5,
            failedTransactionRate: 0.5,
          },
          identity: {
            service: { environment: 'apm-only-1-env', name: 'apm-only-1' },
          },
          id: 'apm-only-0:apm-only-1-env',
          definitionId: 'apm-services',
        },
      },
    ];

    const result = mergeEntities({ entities: services });
    expect(result).toEqual([
      {
        data_stream: { type: ['bar'] },
        agent: { name: ['go'] },
        entity: {
          metric: {
            latency: [500, 500],
            throughput: [0.5, 0.5],
            failedTransactionRate: [0.5, 0.5],
            logRatePerMinute: [null, null],
            logErrorRate: [null, null],
          },
        },
        environments: ['apm-only-1-env'],
        name: 'apm-only-1',
      },
    ]);
  });
});
