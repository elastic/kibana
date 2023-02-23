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
import { UxFetchDataResponse } from '../../typings';

interface UseFetchUxParams {
  absoluteStart: number | undefined;
  absoluteEnd: number | undefined;
  bucketSize: BucketSize;
  hasData: boolean;
  lastUpdated: number;
  relativeStart: string;
  relativeEnd: string;
  serviceName: string;
}

interface UseFetchUxResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  ux: UxFetchDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<UxFetchDataResponse | undefined, unknown>>;
}

export function useFetchUx({
  absoluteStart,
  absoluteEnd,
  bucketSize,
  hasData,
  lastUpdated,
  relativeStart,
  relativeEnd,
  serviceName,
}: UseFetchUxParams): UseFetchUxResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: [
      'fetchUx',
      {
        absoluteStart,
        absoluteEnd,
        bucketSize,
        lastUpdated,
        relativeStart,
        relativeEnd,
        serviceName,
      },
    ],
    queryFn: async () => {
      try {
        if (serviceName && bucketSize && absoluteStart && absoluteEnd) {
          const response = getDataHandler('ux')?.fetchData({
            absoluteTime: { start: absoluteStart, end: absoluteEnd },
            relativeTime: { start: relativeStart, end: relativeEnd },
            serviceName,
            ...bucketSize,
          });

          return response;
        }
      } catch (error) {
        console.log('Something went wrong with fetching infra logs');
      }
    },
    enabled: hasData,
  });

  return { isLoading, isSuccess, isError, ux: data, refetch };
}
