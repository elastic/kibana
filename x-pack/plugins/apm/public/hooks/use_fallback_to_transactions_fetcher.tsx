/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useApmParams } from './use_apm_params';
import { useFetcher } from './use_fetcher';
import { useTimeRange } from './use_time_range';

export function useFallbackToTransactionsFetcher({ kuery }: { kuery: string }) {
  const { query } = useApmParams('/*');

  const rangeFrom = 'rangeFrom' in query ? query.rangeFrom : undefined;
  const rangeTo = 'rangeTo' in query ? query.rangeTo : undefined;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo, optional: true });

  const { data = { fallbackToTransactions: false } } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/fallback_to_transactions', {
        params: {
          query: { kuery, start, end },
        },
      });
    },
    [kuery, start, end]
  );

  return data;
}
