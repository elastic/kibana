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
import { SyntheticsHasDataResponse } from '../../typings';

interface UseFetchSyntheticsUptimeHasDataResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: SyntheticsHasDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<SyntheticsHasDataResponse | undefined, unknown>>;
}

export function useFetchSyntheticsUptimeHasData(): UseFetchSyntheticsUptimeHasDataResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchSyntheticsUptimeHasData'],
    queryFn: async () => {
      try {
        const response = await getDataHandler('synthetics')?.hasData();

        return response;
      } catch (error) {
        console.log('Something went wrong with fetching synthetics uptime has data');
      }
    },
    staleTime: 5000,
  });

  return { isLoading, isSuccess, isError, data, refetch };
}
