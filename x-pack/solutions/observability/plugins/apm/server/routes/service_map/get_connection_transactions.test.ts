/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { LatencyAggregationType } from '@kbn/apm-types';
import { getConnectionTransactions } from './get_connection_transactions';

// withApmSpan is just a tracing wrapper — invoke the callback directly in tests.
jest.mock('../../utils/with_apm_span', () => ({
  withApmSpan: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

type SearchMock = jest.Mock<Promise<unknown>>;

const START = 1_700_000_000_000;
const END = 1_700_000_900_000;
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
    latencyAggregationType: LatencyAggregationType.avg,
    ...overrides,
  };
}

/**
 * Build a minimal ES aggregation response that returns a list of string IDs
 * under the given aggregation name (used for Phase 1 responses).
 */
function idsAggResponse(ids: string[], aggName: string) {
  return {
    aggregations: {
      [aggName]: {
        buckets: ids.map((id) => ({ key: id, doc_count: 1 })),
      },
    },
  };
}

/**
 * Build a Phase 2 ES aggregation response with one bucket per transaction name.
 * The bucket shape is the minimum needed so that `calculateFailedTransactionRate`,
 * `getLatencyValue`, and `calculateThroughputWithRange` do not throw.
 */
function txGroupsAggResponse(txNames: string[]) {
  return {
    aggregations: {
      transaction_groups: {
        buckets: txNames.map((name) => ({
          key: name,
          doc_count: 10,
          // avg latency aggregation (used with LatencyAggregationType.avg)
          latency: { value: 150_000 }, // 150 ms in µs
          // outcome filter aggregation expected by calculateFailedTransactionRate
          // The exact field names mirror what getOutcomeAggregation produces for
          // ApmDocumentType.TransactionEvent.
          outcome: {
            buckets: [
              { key: 'success', doc_count: 9 },
              { key: 'failure', doc_count: 1 },
            ],
          },
          transaction_type: {
            buckets: [{ key: 'request', doc_count: 10 }],
          },
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
  describe('service→dependency path (resource-based, no targetServiceName)', () => {
    it('returns transaction groups when exit spans match the resource', async () => {
      const search: SearchMock = jest
        .fn()
        // Phase 1: exit span / transaction doc IDs
        .mockResolvedValueOnce(idsAggResponse(['tx-1', 'tx-2'], 'transaction_ids'))
        // Phase 2: transaction groups
        .mockResolvedValueOnce(txGroupsAggResponse(['GET /foo', 'POST /bar']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(search).toHaveBeenCalledTimes(2);
      expect(result.transactionGroups).toHaveLength(2);
      expect(result.transactionGroups.map((g) => g.name)).toEqual(['GET /foo', 'POST /bar']);
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('returns empty groups and skips Phase 2 when no exit spans match the resource', async () => {
      const search: SearchMock = jest
        .fn()
        // Phase 1: no IDs found
        .mockResolvedValueOnce(idsAggResponse([], 'transaction_ids'));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      // Phase 2 must never be called when Phase 1 produces nothing.
      expect(search).toHaveBeenCalledTimes(1);
      expect(result.transactionGroups).toEqual([]);
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('sets the correct operation name for Phase 1', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(idsAggResponse([], 'transaction_ids'));

      const apmEventClient = { search } as unknown as APMEventClient;
      await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(search.mock.calls[0][0]).toBe('get_connection_transactions_exit_span_ids');
    });
  });

  // -------------------------------------------------------------------------
  // service→service path (parent-span join, targetServiceName present)
  // -------------------------------------------------------------------------
  describe('service→service path (parent-span join, targetServiceName present)', () => {
    it('returns transaction groups when parent.id chain resolves to source transactions', async () => {
      const search: SearchMock = jest
        .fn()
        // Phase 1a: parent.id values of targetService entry transactions
        .mockResolvedValueOnce(idsAggResponse(['span-abc'], 'parent_ids'))
        // Phase 1b: source transaction IDs containing those spans
        .mockResolvedValueOnce(idsAggResponse(['tx-42'], 'transaction_ids'))
        // Phase 2: transaction groups
        .mockResolvedValueOnce(txGroupsAggResponse(['GET /checkout']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(search).toHaveBeenCalledTimes(3);
      expect(result.transactionGroups).toHaveLength(1);
      expect(result.transactionGroups[0].name).toBe('GET /checkout');
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('returns empty and stops after Phase 1a when targetService has no parent IDs', async () => {
      const search: SearchMock = jest
        .fn()
        // Phase 1a: empty — targetService has no entry transactions with a parent.id
        .mockResolvedValueOnce(idsAggResponse([], 'parent_ids'));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      // Phase 1b and Phase 2 must never be called.
      expect(search).toHaveBeenCalledTimes(1);
      expect(result.transactionGroups).toEqual([]);
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('returns empty and stops after Phase 1b when no source spans carry those parent IDs', async () => {
      const search: SearchMock = jest
        .fn()
        // Phase 1a: found parent IDs
        .mockResolvedValueOnce(idsAggResponse(['span-abc'], 'parent_ids'))
        // Phase 1b: no source transactions match
        .mockResolvedValueOnce(idsAggResponse([], 'transaction_ids'));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      // Phase 2 must never be called when Phase 1b produces nothing.
      expect(search).toHaveBeenCalledTimes(2);
      expect(result.transactionGroups).toEqual([]);
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('sets the correct operation names for Phase 1a and 1b', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(idsAggResponse([], 'parent_ids'));

      const apmEventClient = { search } as unknown as APMEventClient;
      await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(search.mock.calls[0][0]).toBe(
        'get_connection_transactions_target_parent_ids'
      );
    });
  });

  // -------------------------------------------------------------------------
  // isMaxTransactionsReached
  // -------------------------------------------------------------------------
  describe('isMaxTransactionsReached', () => {
    it('is true when Phase 1 (resource-based) returns exactly MAX_IDS transaction IDs', async () => {
      const maxIds = Array.from({ length: MAX_IDS }, (_, i) => `tx-${i}`);

      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(idsAggResponse(maxIds, 'transaction_ids'))
        .mockResolvedValueOnce(txGroupsAggResponse(['GET /']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(result.isMaxTransactionsReached).toBe(true);
    });

    it('is true when Phase 1a (parent-id) returns exactly MAX_IDS parent IDs', async () => {
      const maxParentIds = Array.from({ length: MAX_IDS }, (_, i) => `span-${i}`);

      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(idsAggResponse(maxParentIds, 'parent_ids'))
        .mockResolvedValueOnce(idsAggResponse(['tx-1'], 'transaction_ids'))
        .mockResolvedValueOnce(txGroupsAggResponse(['GET /']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(result.isMaxTransactionsReached).toBe(true);
    });

    it('is true when Phase 1b (source tx) returns exactly MAX_IDS transaction IDs', async () => {
      const maxTxIds = Array.from({ length: MAX_IDS }, (_, i) => `tx-${i}`);

      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(idsAggResponse(['span-1'], 'parent_ids'))
        .mockResolvedValueOnce(idsAggResponse(maxTxIds, 'transaction_ids'))
        .mockResolvedValueOnce(txGroupsAggResponse(['GET /']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(
        makeOptions({ apmEventClient, targetServiceName: 'serviceB' })
      );

      expect(result.isMaxTransactionsReached).toBe(true);
    });

    it('is false when Phase 1 returns fewer than MAX_IDS transaction IDs', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(idsAggResponse(['tx-1', 'tx-2'], 'transaction_ids'))
        .mockResolvedValueOnce(txGroupsAggResponse(['GET /']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('propagates isSampled=true to every transaction group when the cap is reached', async () => {
      const maxIds = Array.from({ length: MAX_IDS }, (_, i) => `tx-${i}`);

      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(idsAggResponse(maxIds, 'transaction_ids'))
        .mockResolvedValueOnce(txGroupsAggResponse(['GET /a', 'POST /b']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(result.isMaxTransactionsReached).toBe(true);
      // Every group should carry isSampled=true when cap is reached.
      result.transactionGroups.forEach((g) => {
        expect(g.isSampled).toBe(true);
      });
    });

    it('propagates isSampled=false to every transaction group when below the cap', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(idsAggResponse(['tx-1'], 'transaction_ids'))
        .mockResolvedValueOnce(txGroupsAggResponse(['GET /a']));

      const apmEventClient = { search } as unknown as APMEventClient;
      const result = await getConnectionTransactions(makeOptions({ apmEventClient }));

      expect(result.isMaxTransactionsReached).toBe(false);
      result.transactionGroups.forEach((g) => {
        expect(g.isSampled).toBe(false);
      });
    });
  });
});
