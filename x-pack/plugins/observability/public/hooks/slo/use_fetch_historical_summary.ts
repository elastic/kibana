/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { FetchHistoricalSummaryResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

export interface UseFetchHistoricalSummaryResponse {
  sloHistoricalSummaryResponse: FetchHistoricalSummaryResponse | undefined;
  isInitialLoading: boolean;
  isRefetching: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface Params {
  sloIds: string[];
}

export function useFetchHistoricalSummary({
  sloIds = [],
}: Params): UseFetchHistoricalSummaryResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
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
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
  });

  return {
    sloHistoricalSummaryResponse: data,
    isLoading,
    isRefetching,
    isInitialLoading,
    isSuccess,
    isError,
  };
}
