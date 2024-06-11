/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntities } from './merge_entities';

const entities = [
  {
    serviceName: 'test',
    agentName: 'nodejs',
    dataStreams: ['metrics', 'logs'],
    entity: {
      latestTimestamp: '2024-06-05T10:34:40.810Z',
      metric: {
        logRatePerMinute: 0,
        logErrorRate: null,
        throughput: 0,
        failedTransactionRate: 0.3333333333333333,
      },
      identity: { service: { environment: 'synthtrace-env-2', name: 'apm-only-1' } },
      id: 'apm-only-1:synthtrace-env-2',
    },
  },
];
describe('mergeEntities', () => {
  it('modifies one service', () => {
    const result = mergeEntities({ entities });
    expect(result).toEqual({});
  });
});
