/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Error, Transaction } from '@kbn/apm-types';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { useFetcher, type FETCH_STATUS } from '../../../hooks/use_fetcher';

export interface UnifiedWaterfallFetcherResult {
  traceItems: TraceItem[];
  errors: Error[];
  agentMarks: Record<string, number>;
  entryTransaction?: Transaction;
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
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (traceId && start && end) {
        return callApmApi('GET /internal/apm/unified_traces/{traceId}', {
          params: {
            path: { traceId },
            query: { start, end, entryTransactionId, serviceName },
          },
        });
      }
    },
    [traceId, start, end, entryTransactionId, serviceName]
  );

  return {
    traceItems: data?.traceItems ?? [],
    errors: (data?.errors ?? []) as Error[],
    agentMarks: data?.agentMarks ?? {},
    entryTransaction: data?.entryTransaction,
    status,
  };
}
