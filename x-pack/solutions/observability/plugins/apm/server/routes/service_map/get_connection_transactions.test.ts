/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { CONNECTION_JOIN_TIME_BUFFER_MS, MAX_CONNECTION_IDS } from './connection_constants';
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

interface ExitSpanFixture {
  transactionId?: string;
  durationUs?: number;
  failed?: boolean;
  outcome?: string;
}

/** Exit spans of the source: each carries the id of the transaction it belongs to. */
function exitSpansResponse(spans: ExitSpanFixture[], total = spans.length) {
  return {
    hits: {
      total: { value: total, relation: 'eq' },
      hits: spans.map(({ transactionId, durationUs = 100_000, failed = false, outcome }) => ({
        fields: {
          ...(transactionId ? { 'transaction.id': [transactionId] } : {}),
          'span.duration.us': [durationUs],
          'event.outcome': [outcome ?? (failed ? 'failure' : 'success')],
        },
      })),
    },
  };
}

/** The transactions of the source that resolve the names of the calls. */
function transactionNamesResponse(
  transactions: Array<{ id: string; name: string; type?: string }>
) {
  return {
    hits: {
      total: { value: transactions.length, relation: 'eq' },
      hits: transactions.map(({ id, name, type = 'request' }) => ({
        fields: {
          'transaction.id': [id],
          'transaction.name': [name],
          ...(type ? { 'transaction.type': [type] } : {}),
        },
      })),
    },
  };
}

describe('getConnectionTransactions', () => {
  describe('service → dependency', () => {
    it('groups the exit spans of the connection resources by the name of their transaction', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          exitSpansResponse([
            { transactionId: 'tx-1' },
            { transactionId: 'tx-1' },
            { transactionId: 'tx-2' },
          ])
        )
        .mockResolvedValueOnce(
          transactionNamesResponse([
            { id: 'tx-1', name: 'GET /api/cart' },
            { id: 'tx-2', name: 'POST /api/checkout' },
          ])
        );

      const result = await getConnectionTransactions(options());

      expect(search.mock.calls.map(([name]) => name)).toEqual([
        'get_connection_transactions_exit_spans',
        'get_connection_transactions_names',
      ]);
      expect(result.transactionGroups.map(({ name }) => name)).toEqual([
        'GET /api/cart',
        'POST /api/checkout',
      ]);
      expect(result.isSampled).toBe(false);
    });

    it('scopes the exit spans to the source and the resources, newest first', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(exitSpansResponse([]));

      await getConnectionTransactions(options({ dependencies: ['redis', 'postgresql'] }));

      const [, request] = search.mock.calls[0];
      expect(request).toMatchObject({
        apm: { events: ['span'] },
        size: MAX_CONNECTION_IDS,
        sort: [{ '@timestamp': 'desc' }],
      });
      expect(request.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceA' } },
          { terms: { 'span.destination.service.resource': ['redis', 'postgresql'] } },
        ])
      );
    });

    it('resolves the transaction names in the source service, deduplicating the ids', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          exitSpansResponse([{ transactionId: 'tx-1' }, { transactionId: 'tx-1' }])
        )
        .mockResolvedValueOnce(transactionNamesResponse([{ id: 'tx-1', name: 'GET /a' }]));

      await getConnectionTransactions(options());

      const [name, request] = search.mock.calls[1];
      expect(name).toBe('get_connection_transactions_names');
      expect(request.apm.events).toEqual(['transaction']);
      expect(request.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceA' } },
          { terms: { 'transaction.id': ['tx-1'] } },
        ])
      );
    });

    it('returns no groups when there are no exit spans', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(exitSpansResponse([]));

      const result = await getConnectionTransactions(options());

      expect(search).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ transactionGroups: [], isSampled: false });
    });

    it('computes the metrics of a group from its exit spans', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          exitSpansResponse([
            { transactionId: 'tx-1', durationUs: 100_000 },
            { transactionId: 'tx-1', durationUs: 300_000, failed: true },
            { transactionId: 'tx-2', durationUs: 100_000 },
          ])
        )
        .mockResolvedValueOnce(
          transactionNamesResponse([
            { id: 'tx-1', name: 'GET /a' },
            { id: 'tx-2', name: 'GET /b' },
          ])
        );

      const { transactionGroups } = await getConnectionTransactions(options());

      expect(transactionGroups[0]).toEqual({
        name: 'GET /a',
        transactionType: 'request',
        avgCallLatency: 200_000,
        callCount: 2,
        callRate: 2 / 15,
        failedCallRate: 0.5,
        timeConsumedPct: 0.8, // 400ms of 500ms
      });
      expect(transactionGroups[1]).toMatchObject({ callCount: 1, failedCallRate: 0 });
    });

    it('rates the failures over the calls with a known outcome only', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          exitSpansResponse([
            { transactionId: 'tx-1', failed: true },
            { transactionId: 'tx-1', outcome: 'unknown' },
            { transactionId: 'tx-2', outcome: 'unknown' },
          ])
        )
        .mockResolvedValueOnce(
          transactionNamesResponse([
            { id: 'tx-1', name: 'GET /a' },
            { id: 'tx-2', name: 'GET /b' },
          ])
        );

      const { transactionGroups } = await getConnectionTransactions(options());

      expect(transactionGroups[0]).toMatchObject({ name: 'GET /a', failedCallRate: 1 });
      expect(transactionGroups[1]).toMatchObject({ name: 'GET /b', failedCallRate: null });
    });

    it('leaves out the calls whose transaction cannot be resolved', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          exitSpansResponse([{ transactionId: 'tx-1' }, { transactionId: 'tx-unknown' }, {}])
        )
        .mockResolvedValueOnce(transactionNamesResponse([{ id: 'tx-1', name: 'GET /a' }]));

      const { transactionGroups } = await getConnectionTransactions(options());

      expect(transactionGroups).toHaveLength(1);
      expect(transactionGroups[0]).toMatchObject({ name: 'GET /a', callCount: 1 });
    });
  });

  describe('service → service', () => {
    it('scopes the exit spans by the resources of the edge when it has them', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(exitSpansResponse([]));

      await getConnectionTransactions(
        options({ targetServiceName: 'serviceB', dependencies: ['opbeans-b:3000'] })
      );

      expect(search.mock.calls.map(([name]) => name)).toEqual([
        'get_connection_transactions_exit_spans',
      ]);
      expect(search.mock.calls[0][1].query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceA' } },
          { terms: { 'span.destination.service.resource': ['opbeans-b:3000'] } },
        ])
      );
    });

    it('falls back to the entry transactions of the target when the edge has no resources', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(entryTransactionsResponse(['span-1', 'span-2']))
        .mockResolvedValueOnce(exitSpansResponse([{ transactionId: 'tx-1' }]))
        .mockResolvedValueOnce(transactionNamesResponse([{ id: 'tx-1', name: 'GET /a' }]));

      const result = await getConnectionTransactions(
        options({ targetServiceName: 'serviceB', dependencies: [] })
      );

      expect(search.mock.calls.map(([name]) => name)).toEqual([
        'get_connection_transactions_target_parent_ids',
        'get_connection_transactions_exit_spans',
        'get_connection_transactions_names',
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

    it('does not filter the environment of the target: the parent id is specific to the call', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(entryTransactionsResponse([]));

      await getConnectionTransactions(options({ targetServiceName: 'serviceB', dependencies: [] }));

      expect(search.mock.calls[0][1]).toMatchObject({
        size: MAX_CONNECTION_IDS,
        sort: [{ '@timestamp': 'desc' }],
        fields: ['parent.id'],
      });
      expect(JSON.stringify(search.mock.calls[0][1].query)).not.toContain('service.environment');
    });

    it('stops after the first query when the target has no entry transaction', async () => {
      const { search, options } = setup();
      search.mockResolvedValueOnce(entryTransactionsResponse([]));

      const result = await getConnectionTransactions(
        options({ targetServiceName: 'serviceB', dependencies: [] })
      );

      expect(search).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ transactionGroups: [], isSampled: false });
    });
  });

  describe('isSampled', () => {
    it('is true when the target has more entry transactions than the cap', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          entryTransactionsResponse(['span-1'], /* total */ MAX_CONNECTION_IDS + 1)
        )
        .mockResolvedValueOnce(exitSpansResponse([{ transactionId: 'tx-1' }]))
        .mockResolvedValueOnce(transactionNamesResponse([{ id: 'tx-1', name: 'GET /a' }]));

      const result = await getConnectionTransactions(
        options({ targetServiceName: 'serviceB', dependencies: [] })
      );

      expect(result.isSampled).toBe(true);
    });

    it('stays true when the sampled parent ids match no exit span of the source', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          entryTransactionsResponse(['span-of-another-caller'], MAX_CONNECTION_IDS + 1)
        )
        .mockResolvedValueOnce(exitSpansResponse([]));

      const result = await getConnectionTransactions(
        options({ targetServiceName: 'serviceB', dependencies: [] })
      );

      expect(result).toEqual({ transactionGroups: [], isSampled: true });
    });

    it('is true when the connection has more exit spans than the cap', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          exitSpansResponse([{ transactionId: 'tx-1' }], /* total */ MAX_CONNECTION_IDS + 1)
        )
        .mockResolvedValueOnce(transactionNamesResponse([{ id: 'tx-1', name: 'GET /a' }]));

      const result = await getConnectionTransactions(options());

      expect(result.isSampled).toBe(true);
    });

    it('is false when exit spans only lack a transaction id (nothing was capped)', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(exitSpansResponse([{ transactionId: 'tx-1' }, {}], /* total */ 2))
        .mockResolvedValueOnce(transactionNamesResponse([{ id: 'tx-1', name: 'GET /a' }]));

      const result = await getConnectionTransactions(options());

      expect(result.isSampled).toBe(false);
    });

    it('is false when every call of the connection fits in the cap', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(entryTransactionsResponse(['span-1'], MAX_CONNECTION_IDS))
        .mockResolvedValueOnce(exitSpansResponse([{ transactionId: 'tx-1' }]))
        .mockResolvedValueOnce(transactionNamesResponse([{ id: 'tx-1', name: 'GET /a' }]));

      const result = await getConnectionTransactions(
        options({ targetServiceName: 'serviceB', dependencies: [] })
      );

      expect(result.isSampled).toBe(false);
    });
  });

  describe('join time buffer', () => {
    it('widens the start of the name lookup so calls of long transactions resolve', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(exitSpansResponse([{ transactionId: 'tx-1' }]))
        .mockResolvedValueOnce(transactionNamesResponse([{ id: 'tx-1', name: 'GET /a' }]));

      await getConnectionTransactions(options());

      const namesRange = search.mock.calls[1][1].query.bool.filter.find(
        (f: Record<string, unknown>) => 'range' in f
      );
      expect(namesRange.range['@timestamp'].gte).toBe(START - CONNECTION_JOIN_TIME_BUFFER_MS);
      expect(namesRange.range['@timestamp'].lte).toBe(END);
    });
  });
});
