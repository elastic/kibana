/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { FetchHistoricalSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';
import { SLO_LONG_REFETCH_INTERVAL } from '../constants';

export interface UseFetchHistoricalSummaryResponse {
  data: FetchHistoricalSummaryResponse | undefined;
  isInitialLoading: boolean;
  isRefetching: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface Params {
  list: Array<{ sloId: string; instanceId: string }>;
  shouldRefetch?: boolean;
}

export function useFetchHistoricalSummary({
  list = [],
  shouldRefetch,
}: Params): UseFetchHistoricalSummaryResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.historicalSummary(list),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.post<FetchHistoricalSummaryResponse>(
          '/internal/observability/slos/_historical_summary',
          {
            body: JSON.stringify({ list }),
            signal,
          }
        );

        return response;
      } catch (error) {
        // ignore error
      }
    },
    enabled: Boolean(list.length > 0),
    refetchInterval: shouldRefetch ? SLO_LONG_REFETCH_INTERVAL : undefined,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isRefetching,
    isInitialLoading,
    isSuccess,
    isError,
  };
}
