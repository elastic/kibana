/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTopDependencySpans } from './get_top_dependency_spans';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { Environment } from '../../../common/environment_rt';

function createApmEventClientMock(
  spanHits: Array<Record<string, unknown>>,
  transactionHits: Array<Record<string, unknown>> = []
): APMEventClient {
  return {
    search: jest
      .fn()
      .mockResolvedValueOnce({ hits: { hits: spanHits } })
      .mockResolvedValueOnce({ hits: { hits: transactionHits } }),
  } as unknown as APMEventClient;
}

function validSpanHit(overrides: Record<string, unknown[]> = {}) {
  return {
    _id: 'span-1',
    _index: 'apm-span',
    fields: {
      'span.id': ['span-1'],
      'trace.id': ['trace-1'],
      'span.name': ['SELECT'],
      'service.name': ['my-service'],
      'agent.name': ['nodejs'],
      'span.duration.us': [1000],
      'event.outcome': ['success'],
      '@timestamp': ['2023-01-01T00:00:00.000Z'],
      ...overrides,
    },
  };
}

describe('getTopDependencySpans', () => {
  const baseParams = {
    dependencyName: 'postgres',
    spanName: 'SELECT',
    start: 0,
    end: 1,
    environment: 'ENVIRONMENT_ALL' as Environment,
    kuery: '',
  };

  describe('transaction lookup query', () => {
    it('bounds the transaction lookup by the span time range', async () => {
      const apmEventClient = createApmEventClientMock([validSpanHit()]);

      await getTopDependencySpans({
        apmEventClient,
        ...baseParams,
        start: 1_000_000,
        end: 2_000_000,
      });

      const searchMock = apmEventClient.search as jest.Mock;
      const [operation, request] = searchMock.mock.calls[1];

      expect(operation).toBe('get_transactions_for_dependency_spans');

      const rangeFilter = request.query.bool.filter.find(
        (clause: Record<string, { '@timestamp'?: unknown }>) =>
          clause.range && '@timestamp' in clause.range
      );

      expect(rangeFilter).toBeDefined();
      // The lookup must be bounded by `@timestamp` to avoid scanning every transaction index,
      // which is what caused the GET /internal/apm/dependencies/operations/spans 500 timeout.
      expect(rangeFilter.range['@timestamp'].lte).toBe(2_000_000);
      // A small lookback keeps parent transactions that started just before the window.
      expect(rangeFilter.range['@timestamp'].gte).toBeLessThan(1_000_000);
    });

    it('does not run the transaction lookup when there are no spans', async () => {
      const apmEventClient = createApmEventClientMock([]);

      const spans = await getTopDependencySpans({ apmEventClient, ...baseParams });

      expect(spans).toHaveLength(0);
      // Only the span search runs; the empty-trace-id transaction search is skipped.
      expect(apmEventClient.search as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });

  it('enriches spans with metadata from the matching transaction', async () => {
    const validTransactionHit = {
      _id: 'tx-1',
      _index: 'apm-transaction',
      fields: {
        'trace.id': ['trace-1'],
        'transaction.id': ['tx-1'],
        'transaction.type': ['request'],
        'transaction.name': ['GET /api'],
      },
    };

    const apmEventClient = createApmEventClientMock([validSpanHit()], [validTransactionHit]);

    const spans = await getTopDependencySpans({ apmEventClient, ...baseParams });

    expect(spans).toHaveLength(1);
    expect(spans[0]).toEqual(
      expect.objectContaining({
        transactionId: 'tx-1',
        transactionType: 'request',
        transactionName: 'GET /api',
      })
    );
  });
});
