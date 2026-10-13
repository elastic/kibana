/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmTraceError } from './get_apm_trace_error';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

function createApmEventClientMock(): APMEventClient {
  return {
    search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
  } as unknown as APMEventClient;
}

async function getSearchFilter(docId?: string): Promise<Array<Record<string, unknown>>> {
  const apmEventClient = createApmEventClientMock();

  await getApmTraceError({
    apmEventClient,
    traceId: 'trace-1',
    docId,
    start: 0,
    end: 1,
  });

  const [, searchParams] = (apmEventClient.search as jest.Mock).mock.calls[0];

  return searchParams.query.bool.filter;
}

describe('getApmTraceError', () => {
  it('does not scope by doc id when none is provided', async () => {
    const filter = await getSearchFilter();

    expect(filter).toContainEqual({ term: { 'trace.id': 'trace-1' } });
    expect(filter).not.toContainEqual(expect.objectContaining({ bool: expect.anything() }));
  });

  // Classic APM errors attached to a transaction carry `transaction.id` and no `span.id`. The
  // waterfall keys them on the transaction doc (see `getErrorsByDocId`), so scoping by `span.id`
  // alone dropped them from the response while they were still counted on the badge.
  it('matches a doc id through span.id or a span-less transaction.id', async () => {
    const filter = await getSearchFilter('doc-1');

    expect(filter).toContainEqual({
      bool: {
        should: [
          { term: { 'span.id': 'doc-1' } },
          {
            bool: {
              filter: [{ term: { 'transaction.id': 'doc-1' } }],
              must_not: { exists: { field: 'span.id' } },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});
