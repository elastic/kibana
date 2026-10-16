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
  TIMESTAMP_US,
  TRACE_ID,
} from '../../../../common/es_fields/apm';
import { toUnprocessedOtelError } from '.';

function makeHit(
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

describe('toUnprocessedOtelError', () => {
  it('returns null when _id is missing', () => {
    const hit = makeHit({ _id: undefined });
    expect(toUnprocessedOtelError(hit)).toBeNull();
  });

  it('returns null when service.name is missing', () => {
    const hit = makeHit({ fields: { [AT_TIMESTAMP]: ['2024-01-01T00:00:00.000Z'] } });
    expect(toUnprocessedOtelError(hit)).toBeNull();
  });

  it('returns null when @timestamp is missing', () => {
    const hit = makeHit({ fields: { [SERVICE_NAME]: ['my-service'] } });
    expect(toUnprocessedOtelError(hit)).toBeNull();
  });

  it('maps a well-formed hit to an ApmError', () => {
    const hit = makeHit();
    const result = toUnprocessedOtelError(hit);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('doc-1');
    expect(result?.service.name).toBe('my-service');
    expect(result?.span?.id).toBe('span-abc');
    expect(result?.trace?.id).toBe('trace-xyz');
    expect(result?.error?.exception?.type).toBe('RuntimeException');
    expect(result?.error?.exception?.message).toBe('something went wrong');
    expect(result?.source).toBe('unprocessedOtel');
  });

  it('omits span when span.id is absent', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [SPAN_ID]: _ignored, ...fieldsWithoutSpan } = makeHit().fields;
    const hit = makeHit({ fields: fieldsWithoutSpan as Record<string, unknown[]> });
    const result = toUnprocessedOtelError(hit);
    expect(result?.span).toBeUndefined();
  });

  it('opts.traceId overrides the per-document trace.id', () => {
    const hit = makeHit();
    const result = toUnprocessedOtelError(hit, { traceId: 'override-trace' });
    expect(result?.trace?.id).toBe('override-trace');
  });

  it('derives timestamp from @timestamp when timestamp_us is absent', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [TIMESTAMP_US]: _ignored, ...fieldsWithoutUsTimestamp } = makeHit().fields as Record<
      string,
      unknown[]
    >;
    const hit = makeHit({ fields: fieldsWithoutUsTimestamp });
    const result = toUnprocessedOtelError(hit);
    const expectedUs = new Date('2024-01-01T00:00:00.000Z').getTime() * 1000;
    expect(result?.timestamp.us).toBe(expectedUs);
  });

  it('returns a valid row when trace.id is absent', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [TRACE_ID]: _ignored, ...fieldsWithoutTrace } = makeHit().fields as Record<
      string,
      unknown[]
    >;
    const hit = makeHit({ fields: fieldsWithoutTrace });
    const result = toUnprocessedOtelError(hit);
    expect(result).not.toBeNull();
    expect(result?.trace).toBeUndefined();
  });
});
