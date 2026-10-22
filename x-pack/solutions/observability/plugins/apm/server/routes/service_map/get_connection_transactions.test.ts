/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { MAX_CONNECTION_IDS } from './connection_constants';
import { getConnectionTransactions } from './get_connection_transactions';

// withApmSpan is just a tracing wrapper: invoke the callback directly in tests.
jest.mock('../../utils/with_apm_span', () => ({
  withApmSpan: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

const START = 1_700_000_000_000;
const END = 1_700_000_900_000; // 15 minutes later

function setup() {
  const search = jest.fn();
  const options = (
    overrides: Partial<Parameters<typeof getConnectionTransactions>[0]> = {}
  ): Parameters<typeof getConnectionTransactions>[0] => ({
    apmEventClient: { search } as unknown as APMEventClient,
    sourceServiceName: 'serviceA',
    dependencies: ['redis'],
    environment: 'production',
    start: START,
    end: END,
    ...overrides,
  });
  return { search, options };
}

/** Entry transactions of the target: the `parent.id` of each one is a span id of the source. */
function entryTransactionsResponse(parentIds: string[], total = parentIds.length) {
  return {
    hits: {
      total: { value: total, relation: 'eq' },
      hits: parentIds.map((id) => ({ fields: { 'parent.id': [id] } })),
    },
  };
}

function exitSpansResponse(
  groups: Array<{
    name: string;
    docCount?: number;
    avgCallLatency?: number | null;
    callTime?: number;
    failedCount?: number;
    transactionType?: string;
  }>,
  totalCallTime?: number
) {
  const buckets = groups.map(
    ({
      name,
      docCount = 10,
      avgCallLatency = 150_000,
      callTime = docCount * (avgCallLatency ?? 0),
      failedCount = 1,
      transactionType = 'request',
    }) => ({
      key: name,
      doc_count: docCount,
      avg_call_latency: { value: avgCallLatency },
      call_time: { value: callTime },
      failed: { doc_count: failedCount },
      transaction_type: {
        buckets: transactionType ? [{ key: transactionType, doc_count: docCount }] : [],
      },
    })
  );
  return {
    aggregations: {
      total_call_time: {
        value: totalCallTime ?? buckets.reduce((sum, bucket) => sum + bucket.call_time.value, 0),
      },
      by_transaction_name: { buckets },
    },
  };
}

describe('getConnectionTransactions', () => {
  describe('service → dependency', () => {
    it('groups the exit spans of the connection resources by transaction name', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(
        exitSpansResponse([{ name: 'GET /api/cart' }, { name: 'POST /api/checkout' }])
      );

      const result = await getConnectionTransactions(options());

      expect(search).toHaveBeenCalledTimes(1);
      expect(search.mock.calls[0][0]).toBe('get_connection_transactions_exit_spans');
      expect(result.transactionGroups.map(({ name }) => name)).toEqual([
        'GET /api/cart',
        'POST /api/checkout',
      ]);
      expect(result.isMaxTransactionsReached).toBe(false);
    });

    it('scopes the query to the exit spans of the source to the resources', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(exitSpansResponse([]));

      await getConnectionTransactions(options({ dependencies: ['redis', 'postgresql'] }));

      const { query, apm } = search.mock.calls[0][1];
      expect(apm.events).toEqual(['span']);
      expect(query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceA' } },
          { terms: { 'span.destination.service.resource': ['redis', 'postgresql'] } },
          { exists: { field: 'transaction.name' } },
        ])
      );
    });

    it('returns no groups when there are no exit spans', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(exitSpansResponse([]));

      const result = await getConnectionTransactions(options());

      expect(result).toEqual({ transactionGroups: [], isMaxTransactionsReached: false });
    });

    it('computes the metrics of a group from the exit spans', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(
        exitSpansResponse([
          { name: 'GET /a', docCount: 30, avgCallLatency: 200_000, failedCount: 3, callTime: 600 },
          { name: 'GET /b', docCount: 10, avgCallLatency: 100_000, failedCount: 0, callTime: 200 },
        ])
      );

      const { transactionGroups } = await getConnectionTransactions(options());

      expect(transactionGroups[0]).toMatchObject({
        name: 'GET /a',
        transactionType: 'request',
        avgCallLatency: 200_000,
        callCount: 30,
        callRate: 2, // 30 calls in 15 minutes
        failedCallRate: 0.1,
        timeConsumedPct: 0.75, // 600 of 800
      });
      expect(transactionGroups[1]).toMatchObject({ callRate: 10 / 15, failedCallRate: 0 });
    });

    it('returns an empty transaction type when the group has none', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(exitSpansResponse([{ name: 'GET /a', transactionType: '' }]));

      const { transactionGroups } = await getConnectionTransactions(options());

      expect(transactionGroups[0].transactionType).toBe('');
    });

    it('does not report a time share when no call has a duration', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(
        exitSpansResponse([{ name: 'GET /a', callTime: 0 }], /* totalCallTime */ 0)
      );

      const { transactionGroups } = await getConnectionTransactions(options());

      expect(transactionGroups[0].timeConsumedPct).toBeNull();
    });
  });

  describe('service → service', () => {
    it('joins the exit spans of the source to the entry transactions of the target', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(entryTransactionsResponse(['span-1', 'span-2']))
        .mockResolvedValueOnce(exitSpansResponse([{ name: 'GET /a' }]));

      const result = await getConnectionTransactions(
        options({ targetServiceName: 'serviceB', dependencies: [] })
      );

      expect(search.mock.calls.map(([name]) => name)).toEqual([
        'get_connection_transactions_target_parent_ids',
        'get_connection_transactions_exit_spans',
      ]);
      expect(search.mock.calls[0][1].query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceB' } },
          { exists: { field: 'parent.id' } },
        ])
      );
      expect(search.mock.calls[1][1].query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceA' } },
          { terms: { 'span.id': ['span-1', 'span-2'] } },
        ])
      );
      expect(result.transactionGroups).toHaveLength(1);
    });

    it('reads the newest entry transactions of the target', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(entryTransactionsResponse([]));

      await getConnectionTransactions(options({ targetServiceName: 'serviceB' }));

      expect(search.mock.calls[0][1]).toMatchObject({
        size: MAX_CONNECTION_IDS,
        sort: [{ '@timestamp': 'desc' }],
        fields: ['parent.id'],
      });
    });

    it('stops after the first query when the target has no entry transaction', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(entryTransactionsResponse([]));

      const result = await getConnectionTransactions(options({ targetServiceName: 'serviceB' }));

      expect(search).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ transactionGroups: [], isMaxTransactionsReached: false });
    });

    it('ignores the resources: the parent span decides which calls reach the target', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(entryTransactionsResponse(['span-1']))
        .mockResolvedValueOnce(exitSpansResponse([]));

      await getConnectionTransactions(
        options({ targetServiceName: 'serviceB', dependencies: ['some-resource'] })
      );

      expect(JSON.stringify(search.mock.calls[1][1].query)).not.toContain(
        'span.destination.service.resource'
      );
    });
  });

  describe('isMaxTransactionsReached', () => {
    it('is true when the target has more entry transactions than the cap', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          entryTransactionsResponse(['span-1'], /* total */ MAX_CONNECTION_IDS + 1)
        )
        .mockResolvedValueOnce(exitSpansResponse([{ name: 'GET /a' }, { name: 'GET /b' }]));

      const result = await getConnectionTransactions(options({ targetServiceName: 'serviceB' }));

      expect(result.isMaxTransactionsReached).toBe(true);
      expect(result.transactionGroups.every(({ isSampled }) => isSampled)).toBe(true);
    });

    it('is false when every entry transaction of the target fits in the cap', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(entryTransactionsResponse(['span-1'], MAX_CONNECTION_IDS))
        .mockResolvedValueOnce(exitSpansResponse([{ name: 'GET /a' }]));

      const result = await getConnectionTransactions(options({ targetServiceName: 'serviceB' }));

      expect(result.isMaxTransactionsReached).toBe(false);
      expect(result.transactionGroups[0].isSampled).toBe(false);
    });

    it('is never set for service → dependency edges', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(exitSpansResponse([{ name: 'GET /a' }]));

      const result = await getConnectionTransactions(options());

      expect(result.isMaxTransactionsReached).toBe(false);
    });
  });
});
