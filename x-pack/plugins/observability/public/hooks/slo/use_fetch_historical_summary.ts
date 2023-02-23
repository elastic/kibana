/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { FetchHistoricalSummaryResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

const EMPTY_RESPONSE: FetchHistoricalSummaryResponse = {};

export interface UseFetchHistoricalSummaryResponse {
  sloHistoricalSummaryResponse: FetchHistoricalSummaryResponse;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<FetchHistoricalSummaryResponse | undefined, unknown>>;
}

export interface Params {
  sloIds: string[];
}

export function useFetchHistoricalSummary({
  sloIds = [],
}: Params): UseFetchHistoricalSummaryResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: ['fetchHistoricalSummary', sloIds],
      queryFn: async ({ signal }) => {
        try {
          const response = await http.post<FetchHistoricalSummaryResponse>(
            '/internal/observability/slos/_historical_summary',
            {
              body: JSON.stringify({ sloIds }),
              signal,
            }
          );

          return response;
        } catch (error) {
          // ignore error for retrieving slos
        }
      },
      refetchOnWindowFocus: false,
    }
  );

  return {
    sloHistoricalSummaryResponse: isInitialLoading ? EMPTY_RESPONSE : data ?? EMPTY_RESPONSE,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
