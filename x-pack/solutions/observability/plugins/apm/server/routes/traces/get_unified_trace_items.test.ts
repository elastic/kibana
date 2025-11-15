/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedTraceErrors } from './get_unified_trace_errors';
import { getErrorsByDocId } from './get_unified_trace_items';

describe('getErrorsByDocId', () => {
  it('groups errors by doc id from apmErrors and unprocessedOtelErrors', () => {
    const unifiedTraceErrors = {
      apmErrors: [
        { spanId: 'a', id: 'error-1' },
        { spanId: 'a', id: 'error-2' },
        { spanId: 'b', id: 'error-3' },
      ],
      unprocessedOtelErrors: [
        { spanId: 'a', id: 'error-5' },
        { spanId: 'c', id: 'error-6' },
      ],
      totalErrors: 7,
    } as UnifiedTraceErrors;

    const result = getErrorsByDocId(unifiedTraceErrors);

    expect(result).toEqual({
      a: [{ errorDocId: 'error-1' }, { errorDocId: 'error-2' }, { errorDocId: 'error-5' }],
      b: [{ errorDocId: 'error-3' }],
      c: [{ errorDocId: 'error-6' }],
    });
  });

  it('returns an empty object if there are no errors', () => {
    const unifiedTraceErrors = {
      apmErrors: [],
      unprocessedOtelErrors: [],
      totalErrors: 0,
    } as UnifiedTraceErrors;

    expect(getErrorsByDocId(unifiedTraceErrors)).toEqual({});
  });

  it('ignores errors with undefined ids', () => {
    const unifiedTraceErrors = {
      apmErrors: [{ spanId: undefined, id: 'error-1' }],
      unprocessedOtelErrors: [{ spanId: undefined, id: 'error-2' }],
      totalErrors: 0,
    } as unknown as UnifiedTraceErrors;

    expect(getErrorsByDocId(unifiedTraceErrors)).toEqual({});
  });
});
