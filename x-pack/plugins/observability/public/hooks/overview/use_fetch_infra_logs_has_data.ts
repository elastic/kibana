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
import { InfraLogsHasDataResponse } from '../../typings';

interface UseFetchInfraLogsHasDataResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: InfraLogsHasDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<InfraLogsHasDataResponse | undefined, unknown>>;
}

export function useFetchInfraLogsHasData(): UseFetchInfraLogsHasDataResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchInfraLogsHasData'],
    queryFn: async () => {
      try {
        const response = await getDataHandler('infra_logs')?.hasData();

        return response;
      } catch (error) {
        console.log('Something went wrong with fetching infra logs');
      }
    },
    staleTime: 5000,
  });

  return { isLoading, isSuccess, isError, data, refetch };
}
