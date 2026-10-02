/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getConnectionTransactions } from './get_connection_transactions';

// withApmSpan is just a tracing wrapper — invoke the callback directly in tests.
jest.mock('../../utils/with_apm_span', () => ({
  withApmSpan: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

type SearchMock = jest.Mock<Promise<unknown>>;

const START = 1_700_000_000_000;
const END = 1_700_000_900_000; // 15 minutes later
const MAX_IDS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOptions(
  overrides: Partial<Parameters<typeof getConnectionTransactions>[0]> = {}
): Parameters<typeof getConnectionTransactions>[0] {
  return {
    apmEventClient: {} as APMEventClient,
    sourceServiceName: 'serviceA',
    dependencies: ['redis'],
    environment: 'production',
    start: START,
    end: END,
    ...overrides,
  };
}

/**
 * Phase 1a response: parent.id values of targetService entry transactions.
 */
function parentIdsResponse(ids: string[]) {
  return {
    aggregations: {
      parent_ids: {
        buckets: ids.map((id) => ({ key: id, doc_count: 1 })),
      },
    },
  };
}

/**
 * Exit span aggregation response (Phase 1b/scope phase) — APM-native buckets only.
 * Each bucket has the sub-aggs produced by the implementation.
 */
function exitSpanAggResponse(
  groups: Array<{
    name: string;
    docCount?: number;
    avgCallLatency?: number | null;
    totalCallTime?: number;
    failedCount?: number;
    txType?: string;
  }>,
  totalCallTime?: number
) {
  const buckets = groups.map(
    ({
      name,
      docCount = 10,
      avgCallLatency = 150_000,
      totalCallTime: groupTotal,
      failedCount = 1,
      txType = 'request',
    }) => ({
      key: name,
      doc_count: docCount,
      avg_call_latency: { value: avgCallLatency },
      total_call_time: { value: groupTotal ?? docCount * (avgCallLatency ?? 0) },
      failed: { doc_count: failedCount },
      transaction_type: { buckets: txType ? [{ key: txType, doc_count: docCount }] : [] },
      trace_ids: { buckets: [] },
    })
  );
  return {
    aggregations: {
      by_tx_name: { buckets },
      total_call_time: {
        value: totalCallTime ?? buckets.reduce((acc, b) => acc + (b.total_call_time.value ?? 0), 0),
      },
    },
  };
}

/**
 * Exit span aggregation response containing an OTel "missing" bucket.
 * The sentinel key is __otel_tx_name_missing__.
 */
function exitSpanOtelResponse(otelDocCount: number, traceIds: string[], avgCallLatency = 100_000) {
  const OTEL_MISSING_KEY = '__otel_tx_name_missing__';
  return {
    aggregations: {
      by_tx_name: {
        buckets: [
          {
            key: OTEL_MISSING_KEY,
            doc_count: otelDocCount,
            avg_call_latency: { value: avgCallLatency },
            total_call_time: { value: avgCallLatency * otelDocCount },
            failed: { doc_count: 0 },
            transaction_type: { buckets: [] },
            trace_ids: { buckets: traceIds.map((id) => ({ key: id, doc_count: 1 })) },
          },
        ],
      },
      total_call_time: { value: avgCallLatency * otelDocCount },
    },
  };
}

/**
 * OTel resolution response (Phase 2): transaction name → bucket mapping.
 */
function otelResolutionResponse(txNames: string[]) {
  return {
    aggregations: {
      by_tx_name: {
        buckets: txNames.map((name) => ({
          key: name,
          doc_count: 5,
          transaction_type: { buckets: [{ key: 'request', doc_count: 5 }] },
        })),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getConnectionTransactions', () => {
  // -------------------------------------------------------------------------
  // service→dependency path (no targetServiceName)
  // -------------------------------------------------------------------------
  describe('service→dependency (resource-based)', () => {
    it('returns transaction groups from exit span aggregation', async () => {
      const search: SearchMock = jest
        .fn()
        // single call: exit span agg with APM-native buckets
        .mockResolvedValueOnce(exitSpanAggResponse([{ name: 'GET /foo' }, { name: 'POST /bar' }]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(search).toHaveBeenCalledTimes(1);
      expect(result.transactionGroups).toHaveLength(2);
      expect(result.transactionGroups.map((g) => g.name)).toEqual(['GET /foo', 'POST /bar']);
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('returns empty groups when exit span agg has no buckets', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(exitSpanAggResponse([]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(search).toHaveBeenCalledTimes(1);
      expect(result.transactionGroups).toEqual([]);
    });

    it('sets the correct operation name for the exit span aggregation', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(exitSpanAggResponse([]));

      const apmEventClient = { search } as unknown as APMEventClient;
      await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(search.mock.calls[0][0]).toBe('get_connection_transactions_exit_span_agg');
    });

    it('computes APM group metrics from exit span durations', async () => {
      // Window = 15 minutes, call count = 10, avg latency = 150 ms = 150_000 µs
      const search: SearchMock = jest.fn().mockResolvedValueOnce(
        exitSpanAggResponse(
          [
            {
              name: 'GET /foo',
              docCount: 10,
              avgCallLatency: 150_000,
              failedCount: 2,
              txType: 'request',
            },
          ],
          /* totalCallTime */ 1_500_000
        )
      );

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      const group = result.transactionGroups[0];
      expect(group.name).toBe('GET /foo');
      expect(group.transactionType).toBe('request');
      expect(group.callCount).toBe(10);
      expect(group.avgCallLatency).toBe(150_000);
      expect(group.failedCallRate).toBeCloseTo(0.2); // 2/10
      expect(group.timeConsumedPct).toBeCloseTo(1.0); // 100% — only one group
    });

    it('isMaxTransactionsReached is always false for resource-based path (no Phase 1 cap)', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(exitSpanAggResponse([{ name: 'GET /' }]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(result.isMaxTransactionsReached).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // OTel path (missing transaction.name bucket)
  // -------------------------------------------------------------------------
  describe('OTel span resolution (missing bucket → Phase 2)', () => {
    it('resolves OTel spans via trace.id → transaction name', async () => {
      const search: SearchMock = jest
        .fn()
        // exit span agg: only OTel spans (missing bucket)
        .mockResolvedValueOnce(exitSpanOtelResponse(5, ['trace-1', 'trace-2']))
        // Phase 2: transaction name resolution
        .mockResolvedValueOnce(otelResolutionResponse(['POST /api/checkout']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(search).toHaveBeenCalledTimes(2);
      expect(search.mock.calls[1][0]).toBe('get_connection_transactions_otel_resolve');
      expect(result.transactionGroups).toHaveLength(1);
      expect(result.transactionGroups[0].name).toBe('POST /api/checkout');
    });

    it('skips Phase 2 when OTel bucket has no trace IDs', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(exitSpanOtelResponse(0, [])); // 0 doc_count, no trace IDs

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      // OTel bucket has doc_count=0, so Phase 2 must NOT be called.
      expect(search).toHaveBeenCalledTimes(1);
      expect(result.transactionGroups).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // service→service path (parent-span join, targetServiceName present)
  // -------------------------------------------------------------------------
  describe('service→service (parent-span join)', () => {
    it('returns transaction groups when parent.id chain resolves to exit spans', async () => {
      const search: SearchMock = jest
        .fn()
        // Phase 1a: parent.id values of targetService entry transactions
        .mockResolvedValueOnce(parentIdsResponse(['span-abc']))
        // exit span agg: source spans whose span.id ∈ parentIds
        .mockResolvedValueOnce(exitSpanAggResponse([{ name: 'GET /checkout' }]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(search).toHaveBeenCalledTimes(2);
      expect(result.transactionGroups).toHaveLength(1);
      expect(result.transactionGroups[0].name).toBe('GET /checkout');
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('returns empty and stops after Phase 1a when targetService has no parent IDs', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(parentIdsResponse([]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      // Exit span agg must never be called.
      expect(search).toHaveBeenCalledTimes(1);
      expect(result.transactionGroups).toEqual([]);
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('sets the correct operation names', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(parentIdsResponse([]));

      const apmEventClient = { search } as unknown as APMEventClient;
      await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(search.mock.calls[0][0]).toBe('get_connection_transactions_target_parent_ids');
    });
  });

  // -------------------------------------------------------------------------
  // isMaxTransactionsReached (service→service only)
  // -------------------------------------------------------------------------
  describe('isMaxTransactionsReached', () => {
    it('is true when Phase 1a returns exactly MAX_IDS parent IDs', async () => {
      const maxParentIds = Array.from({ length: MAX_IDS }, (_, i) => `span-${i}`);

      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(parentIdsResponse(maxParentIds))
        .mockResolvedValueOnce(exitSpanAggResponse([{ name: 'GET /' }]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(result.isMaxTransactionsReached).toBe(true);
    });

    it('is false when Phase 1a returns fewer than MAX_IDS parent IDs', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(parentIdsResponse(['span-1', 'span-2']))
        .mockResolvedValueOnce(exitSpanAggResponse([{ name: 'GET /' }]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('propagates isSampled=true to every group when cap is reached', async () => {
      const maxParentIds = Array.from({ length: MAX_IDS }, (_, i) => `span-${i}`);

      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(parentIdsResponse(maxParentIds))
        .mockResolvedValueOnce(exitSpanAggResponse([{ name: 'GET /a' }, { name: 'POST /b' }]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(result.isMaxTransactionsReached).toBe(true);
      result.transactionGroups.forEach((g) => {
        expect(g.isSampled).toBe(true);
      });
    });

    it('propagates isSampled=false to every group when below the cap', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(parentIdsResponse(['span-1']))
        .mockResolvedValueOnce(exitSpanAggResponse([{ name: 'GET /a' }]));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      result.transactionGroups.forEach((g) => {
        expect(g.isSampled).toBe(false);
      });
    });
  });
});
