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
import { GetSLOResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../../utils/kibana_react';

export interface UseFetchSloDetailsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  slo: SLOWithSummaryResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetSLOResponse | undefined, unknown>>;
}

export function useFetchSloDetails(sloId: string): UseFetchSloDetailsResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: ['fetchSloDetails', sloId],
      queryFn: async ({ signal }) => {
        try {
          const response = await http.get<GetSLOResponse>(`/api/observability/slos/${sloId}`, {
            query: {},
            signal,
          });

          return response;
        } catch (error) {
          // ignore error for retrieving slos
        }
      },
      enabled: Boolean(sloId),
      refetchOnWindowFocus: false,
    }
  );

  return {
    slo: data,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
