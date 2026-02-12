/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Error, Transaction } from '@kbn/apm-types';
import { apmUseUnifiedTraceWaterfall } from '@kbn/observability-plugin/common';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { useKibana } from '../../../context/kibana_context/use_kibana';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { useFetcher, type FETCH_STATUS } from '../../../hooks/use_fetcher';

const INITIAL_DATA: APIReturnType<'GET /internal/apm/unified_traces/{traceId}'> = {
  traceItems: [],
  errors: [],
  agentMarks: {},
  entryTransaction: undefined,
};

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
  const {
    services: { uiSettings },
  } = useKibana();
  const useUnified = uiSettings.get<boolean>(apmUseUnifiedTraceWaterfall);

  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      // When not using unified waterfall, skip the API call.
      // The legacy waterfall uses useWaterfallFetcher instead.
      // This will be removed when we remove the legacy waterfall.
      if (!useUnified) {
        return;
      }
      if (traceId && start && end) {
        return callApmApi('GET /internal/apm/unified_traces/{traceId}', {
          params: {
            path: { traceId },
            query: { start, end, entryTransactionId, serviceName },
          },
        });
      }
    },
    [traceId, start, end, entryTransactionId, serviceName, useUnified]
  );

  return {
    traceItems: data.traceItems,
    errors: data.errors,
    agentMarks: data.agentMarks,
    entryTransaction: data.entryTransaction,
    status,
  };
}
