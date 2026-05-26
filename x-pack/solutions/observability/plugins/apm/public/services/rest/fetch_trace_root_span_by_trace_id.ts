/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIReturnType } from './create_call_apm_api';
import { callApmApi } from './create_call_apm_api';
import { reportFetchError } from './report_fetch_error';

type TraceRootSpan = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/root_span'>;

export const FETCH_TRACE_ROOT_SPAN_OPERATION_ID = 'fetch-trace-root-span';

export const fetchRootSpanByTraceId = async (
  {
    traceId,
    start,
    end,
  }: {
    traceId: string;
    start: string;
    end: string;
  },
  signal: AbortSignal
): Promise<TraceRootSpan | undefined> => {
  try {
    return await callApmApi('GET /internal/apm/unified_traces/{traceId}/root_span', {
      params: {
        path: { traceId },
        query: {
          start,
          end,
        },
      },
      signal,
    });
  } catch (error) {
    reportFetchError({ error, operationId: FETCH_TRACE_ROOT_SPAN_OPERATION_ID });
    throw error;
  }
};
