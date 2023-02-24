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
import { APMHasDataResponse } from '../../typings';

interface UseFetchApmServicesHasDataResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: APMHasDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<APMHasDataResponse | undefined, unknown>>;
}

export function useFetchApmServicesHasData(): UseFetchApmServicesHasDataResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchApmServicesHasData'],
    queryFn: async () => {
      try {
        const response = await getDataHandler('apm')?.hasData();

        return response;
      } catch (error) {
        console.log('Something went wrong with fetching apm services');
      }
    },
    staleTime: 1000,
  });

  return { isLoading, isSuccess, isError, data, refetch };
}
