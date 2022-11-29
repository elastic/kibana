/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INITIAL_DATA } from '../../../../common/watefall';
import { useFetcher } from '../../../hooks/use_fetcher';

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
              entryTransactionId: transactionId,
            },
          },
        });
      }
    },
    [traceId, start, end, transactionId]
  );

  return { waterfall: data, status, error };
}
