/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AT_TIMESTAMP,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  OTEL_EVENT_NAME,
  SERVICE_NAME,
  SPAN_ID,
  TRACE_ID,
} from '../../../common/es_fields/apm';
import {
  getUnprocessedOtelErrorsByService,
  MAX_UNPROCESSED_OTEL_ERRORS,
} from './get_unprocessed_otel_errors_by_service';

function makeRawHit(
  overrides: Partial<{
    _id: string;
    _index: string;
    fields: Record<string, unknown[]>;
  }> = {}
) {
  return {
    _id: 'doc-1',
    _index: 'logs-otel-default',
    fields: {
      [SERVICE_NAME]: ['my-service'],
      [AT_TIMESTAMP]: ['2024-01-01T00:00:00.000Z'],
      [SPAN_ID]: ['span-abc'],
      [TRACE_ID]: ['trace-xyz'],
      [EXCEPTION_TYPE]: ['RuntimeException'],
      [EXCEPTION_MESSAGE]: ['something went wrong'],
      [OTEL_EVENT_NAME]: ['exception'],
    },
    ...overrides,
  };
}

function makeLogsClient(hits: ReturnType<typeof makeRawHit>[]) {
  return {
    search: jest.fn().mockResolvedValue({ hits: { hits } }),
  };
}

const BASE_ARGS = {
  serviceName: 'my-service',
  environment: 'production',
  kuery: '',
  start: 0,
  end: 1_000_000,
};

describe('getUnprocessedOtelErrorsByService', () => {
  it('returns mapped rows for well-formed hits', async () => {
    const logsClient = makeLogsClient([makeRawHit()]);
    const result = await getUnprocessedOtelErrorsByService({ logsClient, ...BASE_ARGS });

    expect(result.unprocessedOtelErrors).toHaveLength(1);
    expect(result.unprocessedOtelErrors[0].id).toBe('doc-1');
    expect(result.maxCountExceeded).toBe(false);
  });

  it('silently skips malformed hits missing required fields', async () => {
    const malformed = makeRawHit({ _id: undefined });
    const logsClient = makeLogsClient([malformed, makeRawHit({ _id: 'good-doc' })]);
    const result = await getUnprocessedOtelErrorsByService({ logsClient, ...BASE_ARGS });

    expect(result.unprocessedOtelErrors).toHaveLength(1);
    expect(result.unprocessedOtelErrors[0].id).toBe('good-doc');
  });

  it('sets maxCountExceeded and truncates when hits exceed the cap', async () => {
    const hits = Array.from({ length: MAX_UNPROCESSED_OTEL_ERRORS + 1 }, (_, i) =>
      makeRawHit({ _id: `doc-${i}` })
    );
    const logsClient = makeLogsClient(hits);
    const result = await getUnprocessedOtelErrorsByService({ logsClient, ...BASE_ARGS });

    expect(result.maxCountExceeded).toBe(true);
    expect(result.unprocessedOtelErrors).toHaveLength(MAX_UNPROCESSED_OTEL_ERRORS);
  });

  it('respects maxRows when provided', async () => {
    const hits = Array.from({ length: 10 }, (_, i) => makeRawHit({ _id: `doc-${i}` }));
    const logsClient = makeLogsClient(hits);
    const result = await getUnprocessedOtelErrorsByService({ logsClient, ...BASE_ARGS, maxRows: 5 });

    expect(result.maxCountExceeded).toBe(true);
    expect(result.unprocessedOtelErrors).toHaveLength(5);
  });

  it('passes serviceName as a term filter via the query', async () => {
    const logsClient = makeLogsClient([]);
    await getUnprocessedOtelErrorsByService({ logsClient, ...BASE_ARGS });

    const [searchQuery] = (logsClient.search as jest.Mock).mock.calls[0];
    const filterClauses = searchQuery.query.bool.filter;
    const serviceFilter = filterClauses.find(
      (f: { term?: Record<string, unknown> }) => f.term?.[SERVICE_NAME] === 'my-service'
    );
    expect(serviceFilter).toBeDefined();
  });

  it('applies kuery as an additional filter when provided', async () => {
    const logsClient = makeLogsClient([]);
    await getUnprocessedOtelErrorsByService({ logsClient, ...BASE_ARGS, kuery: 'span.id : "abc"' });

    const [searchQuery] = (logsClient.search as jest.Mock).mock.calls[0];
    // kqlQuery adds a bool wrapper; just assert the overall filter array has more than the baseline
    const filterClauses = searchQuery.query.bool.filter;
    expect(filterClauses.length).toBeGreaterThan(2); // range + serviceName at minimum
  });
});
