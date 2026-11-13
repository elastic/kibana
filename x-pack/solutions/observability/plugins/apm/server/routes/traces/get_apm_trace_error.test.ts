/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getApmTraceError } from './get_apm_trace_error';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

function createApmEventClientMock(hits: Array<Record<string, unknown>> = []): APMEventClient {
  return {
    search: jest.fn().mockResolvedValue({ hits: { hits } }),
  } as unknown as APMEventClient;
}

function createErrorHit(fields: Record<string, unknown[]>, id = 'doc-id') {
  return {
    _id: id,
    _index: 'apm-error',
    _source: {},
    // `_id` is read from `fields` by `requireFields`, not from the top-level hit
    fields: { _id: [id], ...fields },
  };
}

async function getSearchFilter(docId?: string): Promise<Array<Record<string, unknown>>> {
  const apmEventClient = createApmEventClientMock();

  await getApmTraceError({
    apmEventClient,
    logger: loggingSystemMock.createLogger(),
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

  // A single OTel/partial error document missing a required field (e.g. `error.id`) used to make
  // the whole mapping throw, turning the trace request into a 500. The malformed hit is now
  // skipped and the valid ones returned.
  it('skips malformed hits instead of failing the whole request', async () => {
    const validHit = {
      _id: 'error-1',
      _index: 'apm-error',
      _source: {},
      fields: {
        _id: ['error-1'],
        'timestamp.us': [1000],
        'trace.id': ['trace-1'],
        'service.name': ['my-service'],
        'error.id': ['error-1'],
        'error.grouping_key': ['group-1'],
        'processor.event': ['error'],
      },
    };

    const malformedHit = {
      _id: 'error-2',
      _index: 'logs-generic.otel-default',
      _source: {},
      fields: {
        _id: ['error-2'],
        'timestamp.us': [2000],
        'trace.id': ['trace-1'],
        'service.name': ['my-service'],
        // `error.id` and `error.grouping_key` are missing on this OTel-native document.
        'processor.event': ['error'],
      },
    };

    const apmEventClient = createApmEventClientMock([malformedHit, validHit]);
    const logger = loggingSystemMock.createLogger();

    const errors = await getApmTraceError({
      apmEventClient,
      logger,
      traceId: 'trace-1',
      start: 0,
      end: 1,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe('error-1');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('error-2'));
  });

  // An error document without `error.id` (e.g. OTel-native exception/error events) must not
  // throw `Missing required fields (error.id) in event` and fail the whole trace request with a
  // 500. Such a document is skipped while valid classic APM error docs are still returned.
  it('skips error documents that are missing error.id instead of throwing', async () => {
    const validHit = createErrorHit(
      {
        '@timestamp': [1],
        'timestamp.us': [1000],
        'trace.id': ['trace-1'],
        'service.name': ['svc'],
        'error.id': ['err-1'],
        'error.grouping_key': ['group-1'],
        'processor.event': ['error'],
      },
      'valid-doc'
    );

    const hitWithoutErrorId = createErrorHit(
      {
        '@timestamp': [2],
        'timestamp.us': [2000],
        'trace.id': ['trace-1'],
        'service.name': ['svc'],
        'error.grouping_key': ['group-2'],
        'processor.event': ['error'],
      },
      'otel-doc'
    );

    const apmEventClient = createApmEventClientMock([validHit, hitWithoutErrorId]);

    const result = await getApmTraceError({
      apmEventClient,
      logger: loggingSystemMock.createLogger(),
      traceId: 'trace-1',
      start: 0,
      end: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid-doc');
    expect(result[0].error.id).toBe('err-1');
  });
});
