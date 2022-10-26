/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { getWaterfall } from './waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

const INITIAL_DATA: APIReturnType<'GET /internal/apm/traces/{traceId}'> = {
  errorDocs: [],
  traceDocs: [],
  exceedsMax: false,
  linkedChildrenOfSpanCountBySpanId: {},
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
    data = INITIAL_DATA,
    status,
    error,
  } = useFetcher(
    (callApmApi) => {
      if (traceId && start && end) {
        return callApmApi('GET /internal/apm/traces/{traceId}', {
          params: {
            path: { traceId },
            query: {
              start,
              end,
            },
          },
        });
      }
    },
    [traceId, start, end]
  );

  const waterfall = useMemo(
    () => getWaterfall(data, transactionId),
    [data, transactionId]
  );

  return { waterfall, status, error };
}
