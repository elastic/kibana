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
import { ALL_VALUE, GetSLOBurnRatesResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';
import { SLO_LONG_REFETCH_INTERVAL } from '../constants';

export interface UseFetchSloBurnRatesResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: GetSLOBurnRatesResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetSLOBurnRatesResponse | undefined, unknown>>;
}

interface UseFetchSloBurnRatesParams {
  slo: SLOWithSummaryResponse;
  windows: Array<{ name: string; duration: string }>;
  shouldRefetch?: boolean;
}

export function useFetchSloBurnRates({
  slo,
  windows,
  shouldRefetch,
}: UseFetchSloBurnRatesParams): UseFetchSloBurnRatesResponse {
  const { http } = useKibana().services;
  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: sloKeys.burnRates(slo.id, slo.instanceId, windows),
      queryFn: async ({ signal }) => {
        try {
          const response = await http.post<GetSLOBurnRatesResponse>(
            `/internal/observability/slos/${slo.id}/_burn_rates`,
            {
              body: JSON.stringify({
                windows,
                instanceId: slo.instanceId ?? ALL_VALUE, // TODO Kevin: We should always have an instanceId since we backfill it from the find and get APIs
                remoteName: slo.remote?.remoteName,
              }),
              signal,
            }
          );

          return response;
        } catch (error) {
          // ignore error
        }
      },
      refetchInterval: shouldRefetch ? SLO_LONG_REFETCH_INTERVAL : undefined,
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    data,
    refetch,
    isLoading,
    isRefetching,
    isInitialLoading,
    isSuccess,
    isError,
  };
}
