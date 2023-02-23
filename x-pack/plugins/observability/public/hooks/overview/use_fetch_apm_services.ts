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
import { BucketSize } from '../../pages/overview';
import { ApmFetchDataResponse } from '../../typings';

interface UseFetchApmServicesParams {
  absoluteStart: number | undefined;
  absoluteEnd: number | undefined;
  bucketSize: BucketSize;
  hasData: boolean;
  lastUpdated: number;
  relativeStart: string;
  relativeEnd: string;
}

interface UseFetchApmServicesResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  services: ApmFetchDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<ApmFetchDataResponse | undefined, unknown>>;
}

export function useFetchApmServices({
  absoluteStart,
  absoluteEnd,
  hasData,
  lastUpdated,
  relativeStart,
  relativeEnd,
  bucketSize,
}: UseFetchApmServicesParams): UseFetchApmServicesResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: [
      'fetchApmServices',
      { absoluteStart, absoluteEnd, bucketSize, lastUpdated, relativeStart, relativeEnd },
    ],
    queryFn: async () => {
      try {
        if (bucketSize && absoluteStart && absoluteEnd) {
          const response = await getDataHandler('apm')?.fetchData({
            absoluteTime: { start: absoluteStart, end: absoluteEnd },
            relativeTime: { start: relativeStart, end: relativeEnd },
            ...bucketSize,
          });

          return response;
        }
      } catch (error) {
        console.log('Something went wrong with fetching apm services');
      }
    },
    enabled: hasData,
  });

  return { isLoading, isSuccess, isError, services: data, refetch };
}
