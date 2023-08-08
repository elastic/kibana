/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPreviewDataResponse, Indicator } from '@kbn/slo-schema';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export interface UseGetPreviewData {
  data: GetPreviewDataResponse | undefined;
  isInitialLoading: boolean;
  isRefetching: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetPreviewDataResponse | undefined, unknown>>;
}

export function useGetPreviewData(isValid: boolean, indicator: Indicator): UseGetPreviewData {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: sloKeys.preview(indicator),
      queryFn: async ({ signal }) => {
        const response = await http.post<GetPreviewDataResponse>(
          '/internal/observability/slos/_preview',
          {
            body: JSON.stringify({ indicator }),
            signal,
          }
        );

        return response;
      },
      retry: false,
      refetchOnWindowFocus: false,
      enabled: isValid,
    }
  );

  return {
    data,
    isLoading,
    isRefetching,
    isInitialLoading,
    isSuccess,
    isError,
    refetch,
  };
}
