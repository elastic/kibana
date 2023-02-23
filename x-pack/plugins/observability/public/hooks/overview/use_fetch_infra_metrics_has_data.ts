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
import { getDataHandler } from '../../data_handler';
import { InfraMetricsHasDataResponse } from '../../typings';

interface UseFetchInfraMetricsHasDataResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: InfraMetricsHasDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<InfraMetricsHasDataResponse | undefined, unknown>>;
}

export function useFetchInfraMetricsHasData(): UseFetchInfraMetricsHasDataResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchInfraMetricsHasData'],
    queryFn: async () => {
      try {
        const response = await getDataHandler('infra_metrics')?.hasData();

        return response;
      } catch (error) {
        console.log('Something went wrong with fetching infra metrics');
      }
    },
    staleTime: 5000,
  });

  return { isLoading, isSuccess, isError, data, refetch };
}
