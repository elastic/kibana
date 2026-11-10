/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapServiceStats } from '@kbn/apm-types';
import { aggregateServiceMapStats, getFailingServiceMembers } from './aggregate_service_map_stats';

function stats(
  partial: Partial<ServiceMapServiceStats> & Pick<ServiceMapServiceStats, 'throughput'>
): ServiceMapServiceStats {
  return {
    transactionType: 'request',
    failedTransactionRate: null,
    latency: null,
    requestCount: 100,
    ...partial,
  };
}

describe('aggregateServiceMapStats', () => {
  it('returns undefined when no member has stats', () => {
    expect(aggregateServiceMapStats([undefined, undefined])).toBeUndefined();
  });

  it('sums throughput and request count, weights failure rate, and takes the worst latency', () => {
    expect(
      aggregateServiceMapStats([
        stats({
          throughput: 10,
          failedTransactionRate: 0.1,
          latency: 2000,
          requestCount: 100,
        }),
        stats({
          throughput: 30,
          failedTransactionRate: 0,
          latency: 5000,
          requestCount: 300,
        }),
        undefined,
      ])
    ).toEqual({
      throughput: 40,
      // (10 * 0.1 + 30 * 0) / 40
      failedTransactionRate: 0.025,
      latency: 5000,
      requestCount: 400,
    });
  });

  it('treats a null failure rate as zero when weighting', () => {
    expect(
      aggregateServiceMapStats([
        stats({ throughput: 20, failedTransactionRate: null, requestCount: 20 }),
        stats({ throughput: 20, failedTransactionRate: 0.1, requestCount: 20 }),
      ])
    ).toEqual({
      throughput: 40,
      failedTransactionRate: 0.05,
      latency: null,
      requestCount: 40,
    });
  });

  it('returns a null failure rate when total throughput is zero', () => {
    expect(
      aggregateServiceMapStats([
        stats({ throughput: 0, failedTransactionRate: 0.5, requestCount: 0 }),
      ])
    ).toEqual({
      throughput: 0,
      failedTransactionRate: null,
      latency: null,
      requestCount: 0,
    });
  });
});

describe('getFailingServiceMembers', () => {
  it('lists members at or above 5% failed with enough requests, worst first', () => {
    const result = getFailingServiceMembers([
      { id: 'a', stats: stats({ throughput: 10, failedTransactionRate: 0.11, requestCount: 40 }) },
      { id: 'b', stats: stats({ throughput: 10, failedTransactionRate: 0.06, requestCount: 40 }) },
      { id: 'c', stats: stats({ throughput: 10, failedTransactionRate: 0.01, requestCount: 40 }) },
      { id: 'd' },
    ]);

    expect(result).toEqual({
      failingMemberCount: 2,
      failingMembers: [
        { id: 'a', failedTransactionRate: 0.11 },
        { id: 'b', failedTransactionRate: 0.06 },
      ],
    });
  });

  it('ignores a high failure rate on fewer than 20 requests', () => {
    const result = getFailingServiceMembers([
      {
        id: 'noisy',
        stats: stats({ throughput: 0.1, failedTransactionRate: 0.5, requestCount: 4 }),
      },
      { id: 'ok', stats: stats({ throughput: 10, failedTransactionRate: 0, requestCount: 100 }) },
    ]);

    expect(result).toEqual({ failingMembers: [], failingMemberCount: 0 });
  });

  it('keeps at most three named failing members while counting all of them', () => {
    const members = ['a', 'b', 'c', 'd'].map((id, index) => ({
      id,
      stats: stats({
        throughput: 10,
        failedTransactionRate: 0.2 - index * 0.01,
        requestCount: 50,
      }),
    }));

    const result = getFailingServiceMembers(members);

    expect(result.failingMemberCount).toBe(4);
    expect(result.failingMembers.map((member) => member.id)).toEqual(['a', 'b', 'c']);
  });
});
