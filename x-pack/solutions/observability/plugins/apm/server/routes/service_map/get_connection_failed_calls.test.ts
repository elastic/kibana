/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { MAX_CONNECTION_IDS } from './connection_constants';
import { getConnectionFailedCalls } from './get_connection_failed_calls';

// withApmSpan is just a tracing wrapper: invoke the callback directly in tests.
jest.mock('../../utils/with_apm_span', () => ({
  withApmSpan: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

const START = 1_700_000_000_000;
const END = 1_700_000_900_000;

interface FailedSpanFixture {
  spanId: string;
  traceId?: string;
  httpStatus?: number;
  grpcCode?: number;
}

function setup() {
  const search = jest.fn();
  const options = (
    overrides: Partial<Parameters<typeof getConnectionFailedCalls>[0]> = {}
  ): Parameters<typeof getConnectionFailedCalls>[0] => ({
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

function failedSpansResponse(spans: FailedSpanFixture[], total = spans.length) {
  return {
    hits: {
      total: { value: total, relation: 'eq' },
      hits: spans.map(({ spanId, traceId, httpStatus, grpcCode }) => ({
        fields: {
          'span.id': [spanId],
          ...(traceId ? { 'trace.id': [traceId] } : {}),
          ...(httpStatus ? { 'http.response.status_code': [httpStatus] } : {}),
          ...(grpcCode ? { 'attributes.rpc.grpc.status_code': [grpcCode] } : {}),
        },
      })),
    },
  };
}

function totalCallsResponse(total: number) {
  return { hits: { total: { value: total, relation: 'eq' }, hits: [] } };
}

function entryTransactionsResponse(
  transactions: Array<{ parentId: string; id: string; outcome: 'success' | 'failure' }>
) {
  return {
    hits: {
      total: { value: transactions.length, relation: 'eq' },
      hits: transactions.map(({ parentId, id, outcome }) => ({
        fields: { 'parent.id': [parentId], 'transaction.id': [id], 'event.outcome': [outcome] },
      })),
    },
  };
}

function topErrorResponse(error?: { message: string; groupId: string }) {
  return {
    aggregations: {
      top_group: {
        buckets: error
          ? [
              {
                key: error.groupId,
                doc_count: 1,
                sample: {
                  hits: { hits: [{ fields: { 'error.exception.message': [error.message] } }] },
                },
              },
            ]
          : [],
      },
    },
  };
}

describe('getConnectionFailedCalls', () => {
  describe('queries', () => {
    it('reads the newest failed exit spans of the source to the resources, and counts all calls', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(failedSpansResponse([]))
        .mockResolvedValueOnce(totalCallsResponse(40));

      await getConnectionFailedCalls(options({ dependencies: ['redis', 'postgresql'] }));

      const [failedCall, totalCall] = search.mock.calls;
      expect(failedCall[0]).toBe('get_connection_failed_calls_failed_spans');
      expect(failedCall[1]).toMatchObject({
        apm: { events: ['span'] },
        track_total_hits: true,
        size: MAX_CONNECTION_IDS,
        sort: [{ '@timestamp': 'desc' }],
      });
      expect(failedCall[1].query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceA' } },
          { terms: { 'span.destination.service.resource': ['redis', 'postgresql'] } },
          { term: { 'event.outcome': 'failure' } },
        ])
      );

      expect(totalCall[0]).toBe('get_connection_failed_calls_total_calls');
      expect(totalCall[1].apm.events).toEqual(['span']);
      expect(totalCall[1].query.bool.filter).not.toContainEqual({
        term: { 'event.outcome': 'failure' },
      });
    });

    it('returns the exact totals and no bucket when nothing failed', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(failedSpansResponse([]))
        .mockResolvedValueOnce(totalCallsResponse(40));

      const result = await getConnectionFailedCalls(options());

      expect(result).toEqual({ buckets: [], totalFailed: 0, totalCalls: 40, isSampled: false });
      expect(search).toHaveBeenCalledTimes(2);
    });
  });

  describe('service → dependency', () => {
    it('returns one dependency bucket with the top error document', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          failedSpansResponse([
            { spanId: 'span-1', traceId: 'trace-1' },
            { spanId: 'span-2', traceId: 'trace-2' },
          ])
        )
        .mockResolvedValueOnce(totalCallsResponse(10))
        .mockResolvedValueOnce(topErrorResponse({ message: 'Connection refused', groupId: 'g1' }));

      const result = await getConnectionFailedCalls(options());

      expect(result).toEqual({
        buckets: [
          {
            type: 'dependency',
            count: 2,
            sampleTraceId: 'trace-1',
            topError: 'Connection refused',
            topErrorGroupId: 'g1',
          },
        ],
        totalFailed: 2,
        totalCalls: 10,
        isSampled: false,
      });
    });

    it('looks for the error documents of the spans by parent.id or span.id', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(failedSpansResponse([{ spanId: 'span-1' }, { spanId: 'span-2' }]))
        .mockResolvedValueOnce(totalCallsResponse(10))
        .mockResolvedValueOnce(topErrorResponse());

      await getConnectionFailedCalls(options());

      const errorQuery = search.mock.calls[2];
      expect(errorQuery[0]).toBe('get_connection_failed_calls_top_error_of_spans');
      expect(errorQuery[1].apm.events).toEqual(['error']);
      expect(errorQuery[1].query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceA' } },
          {
            bool: {
              should: [
                { terms: { 'parent.id': ['span-1', 'span-2'] } },
                { terms: { 'span.id': ['span-1', 'span-2'] } },
              ],
              minimum_should_match: 1,
            },
          },
        ])
      );
    });

    it('falls back to the most frequent HTTP status when there is no error document', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(
          failedSpansResponse([
            { spanId: 'span-1', httpStatus: 503 },
            { spanId: 'span-2', httpStatus: 500 },
            { spanId: 'span-3', httpStatus: 503 },
          ])
        )
        .mockResolvedValueOnce(totalCallsResponse(10))
        .mockResolvedValueOnce(topErrorResponse());

      const { buckets } = await getConnectionFailedCalls(options());

      expect(buckets[0]).toMatchObject({ topError: 'HTTP 503', topErrorGroupId: null });
    });

    it('falls back to the gRPC status name when there is no HTTP status', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(failedSpansResponse([{ spanId: 'span-1', grpcCode: 14 }]))
        .mockResolvedValueOnce(totalCallsResponse(10))
        .mockResolvedValueOnce(topErrorResponse());

      const { buckets } = await getConnectionFailedCalls(options());

      expect(buckets[0]).toMatchObject({ topError: 'gRPC UNAVAILABLE', topErrorGroupId: null });
    });

    it.each([
      [6, 'ALREADY_EXISTS'],
      [9, 'FAILED_PRECONDITION'],
      [15, 'DATA_LOSS'],
    ])('names the gRPC status %i', async (grpcCode, name) => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(failedSpansResponse([{ spanId: 'span-1', grpcCode }]))
        .mockResolvedValueOnce(totalCallsResponse(10))
        .mockResolvedValueOnce(topErrorResponse());

      const { buckets } = await getConnectionFailedCalls(options());

      expect(buckets[0]).toMatchObject({ topError: `gRPC ${name}` });
    });

    it('has no top error when nothing explains the failure', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(failedSpansResponse([{ spanId: 'span-1' }]))
        .mockResolvedValueOnce(totalCallsResponse(10))
        .mockResolvedValueOnce(topErrorResponse());

      const { buckets } = await getConnectionFailedCalls(options());

      expect(buckets[0]).toMatchObject({ topError: null, topErrorGroupId: null });
    });
  });

  describe('sampling', () => {
    it('reports exact totals and flags the result when more spans failed than were classified', async () => {
      const { search, options } = setup();
      search
        .mockResolvedValueOnce(failedSpansResponse([{ spanId: 'span-1' }], /* total */ 5_000))
        .mockResolvedValueOnce(totalCallsResponse(20_000))
        .mockResolvedValueOnce(topErrorResponse());

      const result = await getConnectionFailedCalls(options());

      expect(result).toMatchObject({ totalFailed: 5_000, totalCalls: 20_000, isSampled: true });
      expect(result.buckets[0].count).toBe(1);
    });
  });

  describe('service → service', () => {
    const failedSpans = [
      { spanId: 'caller-span', traceId: 'trace-caller', httpStatus: 504 },
      { spanId: 'server-span', traceId: 'trace-server' },
      { spanId: 'client-span', traceId: 'trace-client', httpStatus: 400 },
    ];

    function mockServiceToService(search: jest.Mock) {
      search
        .mockResolvedValueOnce(failedSpansResponse(failedSpans))
        .mockResolvedValueOnce(totalCallsResponse(30))
        // entry transactions of the target: the caller span never reached it
        .mockResolvedValueOnce(
          entryTransactionsResponse([
            { parentId: 'server-span', id: 'tx-server', outcome: 'failure' },
            { parentId: 'client-span', id: 'tx-client', outcome: 'success' },
          ])
        )
        // top errors: caller bucket (spans) and server bucket (target transactions)
        .mockResolvedValueOnce(topErrorResponse())
        .mockResolvedValueOnce(
          topErrorResponse({ message: 'NullPointerException', groupId: 'g2' })
        );
    }

    it('classifies the failed spans by what happened in the target service', async () => {
      const { search, options } = setup();
      mockServiceToService(search);

      const result = await getConnectionFailedCalls(options({ targetServiceName: 'serviceB' }));

      expect(result.buckets).toEqual([
        {
          type: 'caller',
          count: 1,
          sampleTraceId: 'trace-caller',
          topError: 'HTTP 504',
          topErrorGroupId: null,
        },
        {
          type: 'server',
          count: 1,
          sampleTraceId: 'trace-server',
          topError: 'NullPointerException',
          topErrorGroupId: 'g2',
        },
        {
          type: 'client',
          count: 1,
          sampleTraceId: 'trace-client',
          topError: 'HTTP 400',
          topErrorGroupId: null,
        },
      ]);
      expect(result).toMatchObject({ totalFailed: 3, totalCalls: 30, isSampled: false });
    });

    it('finds the entry transactions of the target by the failed span ids, in any environment', async () => {
      const { search, options } = setup();
      mockServiceToService(search);

      await getConnectionFailedCalls(options({ targetServiceName: 'serviceB' }));

      const entryTransactionsQuery = search.mock.calls[2];
      expect(entryTransactionsQuery[0]).toBe('get_connection_failed_calls_target_transactions');
      expect(entryTransactionsQuery[1].apm.events).toEqual(['transaction']);
      expect(entryTransactionsQuery[1].query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceB' } },
          { terms: { 'parent.id': ['caller-span', 'server-span', 'client-span'] } },
        ])
      );
      expect(JSON.stringify(entryTransactionsQuery[1].query)).not.toContain('service.environment');
    });

    it('looks for the server errors in the failed entry transactions of the target', async () => {
      const { search, options } = setup();
      mockServiceToService(search);

      await getConnectionFailedCalls(options({ targetServiceName: 'serviceB' }));

      const serverErrorQuery = search.mock.calls[4];
      expect(serverErrorQuery[0]).toBe('get_connection_failed_calls_top_error_of_transactions');
      expect(serverErrorQuery[1].query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'service.name': 'serviceB' } },
          { terms: { 'transaction.id': ['tx-server'] } },
        ])
      );
    });
  });
});
