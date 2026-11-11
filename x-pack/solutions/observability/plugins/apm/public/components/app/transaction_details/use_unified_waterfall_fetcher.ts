/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Error, Transaction } from '@kbn/apm-types';
import type { APIReturnType } from '@kbn/apm-api-shared';
import { useMemo } from 'react';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
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
  /** Classic APM error documents only — used to render error marks on the waterfall timeline. */
  errors: Error[];
  /**
   * Sum of the per-item unified errors (APM + unprocessed OTel exception logs) across all
   * trace items — i.e. exactly the total the waterfall row badges render.
   */
  totalErrors: number;
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
  refreshToken,
}: {
  start: string;
  end: string;
  traceId?: string;
  entryTransactionId?: string;
  serviceName?: string;
  /** Host-local refresh signal (e.g. service flyout) — avoids app-wide timeRangeId bumps. */
  refreshToken?: number;
}): UnifiedWaterfallFetcherResult {
  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      void refreshToken;
      if (traceId && start && end) {
        return callApmApi('GET /internal/apm/unified_traces/{traceId}', {
          params: {
            path: { traceId },
            query: { start, end, entryTransactionId, serviceName, ecsOnly: true },
          },
        });
      }
    },
    [traceId, start, end, entryTransactionId, serviceName, refreshToken]
  );

  const totalErrors = useMemo(
    () => data.traceItems.reduce((acc: number, item: TraceItem) => acc + item.errors.length, 0),
    [data.traceItems]
  );

  if (traceId === undefined) {
    return {
      ...INITIAL_DATA,
      totalErrors: 0,
      status: FETCH_STATUS.NOT_INITIATED,
    };
  }

  return {
    traceItems: data.traceItems,
    errors: data.errors,
    totalErrors,
    agentMarks: data.agentMarks,
    entryTransaction: data.entryTransaction,
    traceDocsTotal: data.traceDocsTotal,
    maxTraceItems: data.maxTraceItems,
    status,
  };
}
