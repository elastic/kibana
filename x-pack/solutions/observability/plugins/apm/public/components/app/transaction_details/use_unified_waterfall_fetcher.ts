/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Error, Transaction } from '@kbn/apm-types';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { useFetcher, FETCH_STATUS } from '../../../hooks/use_fetcher';

const INITIAL_DATA: APIReturnType<'GET /internal/apm/unified_traces/{traceId}'> = {
  traceItems: [],
  errors: [],
  agentMarks: {},
  entryTransaction: undefined,
  traceDocsTotal: 0,
  maxTraceItems: 0,
};

export interface UnifiedWaterfallFetcherResult {
  traceItems: TraceItem[];
  errors: Error[];
  agentMarks: Record<string, number>;
  entryTransaction?: Transaction;
  traceDocsTotal: number;
  maxTraceItems: number;
  status: FETCH_STATUS;
}

export function useUnifiedWaterfallFetcher({
  start,
  end,
  traceId,
  entryTransactionId,
  serviceName,
}: {
  start: string;
  end: string;
  traceId?: string;
  entryTransactionId?: string;
  serviceName?: string;
}) {
  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      if (traceId && start && end) {
        return callApmApi('GET /internal/apm/unified_traces/{traceId}', {
          params: {
            path: { traceId },
            query: { start, end, entryTransactionId, serviceName, ecsOnly: true },
          },
        });
      }
    },
    [traceId, start, end, entryTransactionId, serviceName]
  );

  if (traceId === undefined) {
    return {
      ...INITIAL_DATA,
      status: FETCH_STATUS.NOT_INITIATED,
    };
  }

  return {
    traceItems: data.traceItems,
    errors: data.errors,
    agentMarks: data.agentMarks,
    entryTransaction: data.entryTransaction,
    traceDocsTotal: data.traceDocsTotal,
    maxTraceItems: data.maxTraceItems,
    status,
  };
}
