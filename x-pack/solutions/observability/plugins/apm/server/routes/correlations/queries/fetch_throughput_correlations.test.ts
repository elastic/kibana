/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonLocalIndexName } from '@kbn/es-query';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { fetchThroughputCorrelations } from './fetch_throughput_correlations';

jest.mock('@kbn/es-query');

const mockIsNonLocalIndexName = isNonLocalIndexName as jest.MockedFunction<
  typeof isNonLocalIndexName
>;

function makeBucket(key: number, rpmValue: number, docCount = 100) {
  return { key, doc_count: docCount, throughput: { value: rpmValue } };
}

const mockSearch = jest.fn();
const mockApmEventClient = {
  search: mockSearch,
  indices: { transaction: 'apm-*-transaction-*' },
} as unknown as APMEventClient;

const defaultParams = {
  apmEventClient: mockApmEventClient,
  entityType: 'transaction' as const,
  start: 0,
  end: 3_600_000,
  environment: 'ENVIRONMENT_ALL',
  query: { match_all: {} } as any,
  kuery: '',
};

// Overall RPM: rises sharply from bucket 0 to bucket 1
const overallBuckets = [
  makeBucket(0, 10),
  makeBucket(60_000, 50),
  makeBucket(120_000, 50),
];

// Filtered RPM that closely mirrors the overall (high positive correlation)
const correlatedBuckets = [
  makeBucket(0, 5),
  makeBucket(60_000, 40),
  makeBucket(120_000, 42),
];

// Filtered RPM that is flat (near-zero correlation)
const uncorrelatedBuckets = [
  makeBucket(0, 20),
  makeBucket(60_000, 20),
  makeBucket(120_000, 20),
];

describe('fetchThroughputCorrelations', () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockIsNonLocalIndexName.mockReturnValue(false);
  });

  it('returns correlations above the threshold', async () => {
    mockSearch
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: overallBuckets } } })
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: correlatedBuckets } } });

    const result = await fetchThroughputCorrelations({
      ...defaultParams,
      fieldValuePairs: [{ fieldName: 'host.name', fieldValue: 'host-a' }],
    });

    expect(result.throughputCorrelations).toHaveLength(1);
    expect(result.throughputCorrelations[0]).toMatchObject({
      fieldName: 'host.name',
      fieldValue: 'host-a',
    });
    expect(Math.abs(result.throughputCorrelations[0].correlation ?? 0)).toBeGreaterThanOrEqual(0.3);
  });

  it('returns fallback result when no correlation meets the threshold', async () => {
    mockSearch
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: overallBuckets } } })
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: uncorrelatedBuckets } } });

    const result = await fetchThroughputCorrelations({
      ...defaultParams,
      fieldValuePairs: [{ fieldName: 'host.name', fieldValue: 'host-b' }],
    });

    expect(result.throughputCorrelations).toHaveLength(0);
    expect(result.fallbackResult).toBeDefined();
    expect(result.fallbackResult?.isFallbackResult).toBe(true);
  });

  it('returns empty correlations and no fallback when all pairs have zero traffic', async () => {
    const zeroBuckets = overallBuckets.map((b) => ({ ...b, throughput: { value: 0 } }));
    mockSearch
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: overallBuckets } } })
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: zeroBuckets } } });

    const result = await fetchThroughputCorrelations({
      ...defaultParams,
      fieldValuePairs: [{ fieldName: 'host.name', fieldValue: 'host-c' }],
    });

    expect(result.throughputCorrelations).toHaveLength(0);
    expect(result.fallbackResult).toBeUndefined();
  });

  it('returns empty arrays with no field-value pairs', async () => {
    mockSearch.mockResolvedValueOnce({
      aggregations: { timeseries: { buckets: overallBuckets } },
    });

    const result = await fetchThroughputCorrelations({
      ...defaultParams,
      fieldValuePairs: [],
    });

    expect(result.throughputCorrelations).toHaveLength(0);
    expect(result.fallbackResult).toBeUndefined();
    expect(result.totalDocCount).toBe(300);
  });

  it('processes requests in chunks and does not short-circuit on individual failures', async () => {
    // First call is the overall timeseries, subsequent calls alternate success/failure
    mockSearch
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: overallBuckets } } })
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: correlatedBuckets } } })
      .mockRejectedValueOnce(new Error('ES error'))
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: correlatedBuckets } } });

    const result = await fetchThroughputCorrelations({
      ...defaultParams,
      fieldValuePairs: [
        { fieldName: 'host.name', fieldValue: 'host-a' },
        { fieldName: 'host.name', fieldValue: 'host-b' },
        { fieldName: 'host.name', fieldValue: 'host-c' },
      ],
    });

    // Two succeeded, one failed — the two correlated ones should appear
    expect(result.throughputCorrelations).toHaveLength(2);
  });

  it('sets ccsWarning when there are rejections on a non-local index', async () => {
    mockIsNonLocalIndexName.mockReturnValue(true);
    mockSearch
      .mockResolvedValueOnce({ aggregations: { timeseries: { buckets: overallBuckets } } })
      .mockRejectedValueOnce(new Error('CCS error'));

    const result = await fetchThroughputCorrelations({
      ...defaultParams,
      fieldValuePairs: [{ fieldName: 'host.name', fieldValue: 'host-a' }],
    });

    expect(result.ccsWarning).toBe(true);
  });
});
