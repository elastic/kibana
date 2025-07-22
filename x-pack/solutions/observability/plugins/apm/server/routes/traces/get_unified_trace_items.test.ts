/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedTraceErrors } from './get_unified_trace_errors';
import { getErrorCountByDocId } from './get_unified_trace_items';

describe('getErrorCountByDocId', () => {
  it('counts errors grouped by doc id from apmErrors and unprocessedOtelErrors', () => {
    const unifiedTraceErrors = {
      apmErrors: [
        { parent: { id: 'a' } },
        { parent: { id: 'a' } },
        { parent: { id: 'b' } },
        { parent: { id: undefined } },
      ],
      unprocessedOtelErrors: [{ id: 'a' }, { id: 'c' }, { id: undefined }],
      totalErrors: 5,
    } as UnifiedTraceErrors;

    const result = getErrorCountByDocId(unifiedTraceErrors);

    expect(result).toEqual({
      a: 3,
      b: 1,
      c: 1,
    });
  });

  it('returns an empty object if there are no errors', () => {
    const unifiedTraceErrors = {
      apmErrors: [],
      unprocessedOtelErrors: [],
      totalErrors: 0,
    } as UnifiedTraceErrors;

    expect(getErrorCountByDocId(unifiedTraceErrors)).toEqual({});
  });

  it('ignores errors with undefined ids', () => {
    const unifiedTraceErrors = {
      apmErrors: [{ parent: { id: undefined } }],
      unprocessedOtelErrors: [{ id: undefined }],
      totalErrors: 0,
    } as UnifiedTraceErrors;

    expect(getErrorCountByDocId(unifiedTraceErrors)).toEqual({});
  });
});
