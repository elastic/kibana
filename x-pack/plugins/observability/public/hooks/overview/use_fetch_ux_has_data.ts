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
import { UXHasDataResponse } from '../../typings';

interface UseFetchUxHasDataResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: UXHasDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<UXHasDataResponse | undefined, unknown>>;
}

export function useFetchUxHasData(): UseFetchUxHasDataResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchUxHasData'],
    queryFn: async () => {
      try {
        const response = await getDataHandler('ux')?.hasData();

        return response;
      } catch (error) {
        console.log('Something went wrong with fetching synthetics uptime has data');
      }
    },
    staleTime: 5000,
  });

  return { isLoading, isSuccess, isError, data, refetch };
}
