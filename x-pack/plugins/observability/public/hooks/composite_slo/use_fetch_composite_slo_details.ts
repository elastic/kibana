/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetCompositeSLOResponse } from '@kbn/slo-schema';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { useKibana } from '../../utils/kibana_react';
import { compositeSloKeys } from '../slo/query_key_factory';

export interface UseFetchSloDetailsResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: GetCompositeSLOResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetCompositeSLOResponse | undefined, unknown>>;
}

const LONG_REFETCH_INTERVAL = 1000 * 60; // 1 minute

export function useFetchCompositeSloDetails({
  compositeSloId,
  shouldRefetch,
}: {
  compositeSloId?: string;
  shouldRefetch?: boolean;
}): UseFetchSloDetailsResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: compositeSloKeys.detail(compositeSloId),
      queryFn: async ({ signal }) => {
        try {
          const response = await http.get<GetCompositeSLOResponse>(
            `/api/observability/composite_slos/${compositeSloId}`,
            { query: {}, signal }
          );

          return response;
        } catch (error) {
          // ignore error for retrieving composite slo
        }
      },
      keepPreviousData: true,
      enabled: Boolean(compositeSloId),
      refetchInterval: shouldRefetch ? LONG_REFETCH_INTERVAL : undefined,
      refetchOnWindowFocus: false,
    }
  );

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
