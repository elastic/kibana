/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIReturnType } from './create_call_apm_api';
import { callApmApi } from './create_call_apm_api';

type ErrorsByTraceId = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/errors'>;

export const fetchErrorsByTraceId = (
  {
    traceId,
    docId,
    start,
    end,
  }: {
    traceId: string;
    docId?: string;
    start: string;
    end: string;
  },
  signal: AbortSignal
): Promise<ErrorsByTraceId> =>
  callApmApi('GET /internal/apm/unified_traces/{traceId}/errors', {
    params: {
      path: { traceId },
      query: {
        docId,
        start,
        end,
      },
    },
    signal,
  });
