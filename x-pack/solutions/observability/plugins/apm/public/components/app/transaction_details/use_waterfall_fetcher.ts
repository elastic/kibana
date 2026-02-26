/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { apmUseUnifiedTraceWaterfall } from '@kbn/observability-plugin/common';
import { useKibana } from '../../../context/kibana_context/use_kibana';
import { useFetcher } from '../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { getWaterfall } from './waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

const INITIAL_DATA: APIReturnType<'GET /internal/apm/traces/{traceId}'> = {
  traceItems: {
    errorDocs: [],
    traceDocs: [],
    exceedsMax: false,
    spanLinksCountById: {},
    traceDocsTotal: 0,
    maxTraceItems: 0,
  },
  entryTransaction: undefined,
};
export type WaterfallFetchResult = ReturnType<typeof useWaterfallFetcher>;

export function useWaterfallFetcher({
  traceId,
  transactionId,
  start,
  end,
}: {
  traceId?: string;
  transactionId?: string;
  start: string;
  end: string;
}) {
  const {
    services: { uiSettings },
  } = useKibana();
  const useUnified = uiSettings.get<boolean>(apmUseUnifiedTraceWaterfall);

  const {
    data = INITIAL_DATA,
    status,
    error,
  } = useFetcher(
    (callApmApi) => {
      // When using unified waterfall, skip the legacy API call.
      // The unified waterfall uses useUnifiedWaterfallFetcher instead.
      // This will be removed when we remove the legacy waterfall.
      if (useUnified) {
        return;
      }
      if (traceId && start && end && transactionId) {
        return callApmApi('GET /internal/apm/traces/{traceId}', {
          params: {
            path: { traceId },
            query: {
              start,
              end,
              entryTransactionId: transactionId,
            },
          },
        });
      }
    },
    [traceId, start, end, transactionId, useUnified]
  );

  const waterfall = useMemo(() => getWaterfall(traceId ? data : INITIAL_DATA), [data, traceId]);

  return { waterfall, status, error, useUnified };
}
