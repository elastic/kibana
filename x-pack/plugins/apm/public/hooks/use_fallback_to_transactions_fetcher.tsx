/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUrlParams } from '../context/url_params_context/use_url_params';
import { useFetcher } from './use_fetcher';

export function useFallbackToTransactionsFetcher({ kuery }: { kuery: string }) {
  const {
    urlParams: { start, end },
  } = useUrlParams();
  const { data = { fallbackToTransactions: false } } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/fallback_to_transactions',
        params: {
          query: { kuery, start, end },
        },
      });
    },
    [kuery, start, end]
  );

  return data;
}
