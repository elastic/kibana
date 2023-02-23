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
import { UptimeFetchDataResponse } from '../../typings';

interface UseFetchSyntheticsUptimeParams {
  absoluteStart: number | undefined;
  absoluteEnd: number | undefined;
  bucketSize: BucketSize;
  hasData: boolean;
  lastUpdated: number;
  relativeStart: string;
  relativeEnd: string;
  timeZone: any;
}

interface UseFetchSyntheticsUptimeResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  monitors: UptimeFetchDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<UptimeFetchDataResponse | undefined, unknown>>;
}

export function useFetchSyntheticsUptime({
  absoluteStart,
  absoluteEnd,
  bucketSize,
  hasData,
  lastUpdated,
  relativeStart,
  relativeEnd,
  timeZone,
}: UseFetchSyntheticsUptimeParams): UseFetchSyntheticsUptimeResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: [
      'fetchSyntheticsUptime',
      { absoluteStart, absoluteEnd, bucketSize, lastUpdated, relativeStart, relativeEnd, timeZone },
    ],
    queryFn: async () => {
      try {
        if (bucketSize && absoluteStart && absoluteEnd) {
          const response = await getDataHandler('synthetics')?.fetchData({
            absoluteTime: { start: absoluteStart, end: absoluteEnd },
            relativeTime: { start: relativeStart, end: relativeEnd },
            timeZone,
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

  return { isLoading, isSuccess, isError, monitors: data, refetch };
}
