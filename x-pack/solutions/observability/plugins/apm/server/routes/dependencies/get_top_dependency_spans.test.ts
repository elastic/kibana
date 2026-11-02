/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
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

  // A single OTel/partial span missing a required field (e.g. `event.outcome`) used to make the
  // whole mapping throw, turning the request into a 500 (issue #1363). The route now skips the
  // malformed hit and returns the valid ones instead.
  it('skips malformed span hits instead of failing the whole request', async () => {
    const malformedSpanHit = {
      _id: 'span-2',
      _index: 'logs-generic.otel-default',
      fields: {
        'span.id': ['span-2'],
        'trace.id': ['trace-2'],
        'span.name': ['SELECT'],
        'service.name': ['my-service'],
        'agent.name': ['otlp'],
        'span.duration.us': [2000],
        // `event.outcome` is missing on this OTel-native document.
        '@timestamp': ['2023-01-01T00:00:00.000Z'],
      },
    };

    const apmEventClient = createApmEventClientMock([malformedSpanHit, validSpanHit()]);
    const logger = loggingSystemMock.createLogger();

    const spans = await getTopDependencySpans({
      apmEventClient,
      logger,
      ...baseParams,
    });

    expect(spans).toHaveLength(1);
    expect(spans[0].spanId).toBe('span-1');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('span-2'));
  });

  it('returns all spans when they are all well-formed', async () => {
    const apmEventClient = createApmEventClientMock([
      validSpanHit(),
      validSpanHit({ 'span.id': ['span-3'], 'trace.id': ['trace-3'] }),
    ]);
    const logger = loggingSystemMock.createLogger();

    const spans = await getTopDependencySpans({
      apmEventClient,
      logger,
      ...baseParams,
    });

    expect(spans).toHaveLength(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
