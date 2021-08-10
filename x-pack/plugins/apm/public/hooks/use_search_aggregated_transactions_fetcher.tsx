/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUrlParams } from '../context/url_params_context/use_url_params';
import { useFetcher } from './use_fetcher';

export function useSearchAggregatedTransactionsFetcher() {
  const {
    urlParams: { kuery },
  } = useUrlParams();
  const { data = { searchAggregatedTransactions: true } } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/search_aggregated_transactions',
        params: {
          query: { kuery },
        },
      });
    },
    [kuery]
  );

  return data;
}
