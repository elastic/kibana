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
import { LogsFetchDataResponse } from '../../typings';

interface UseFetchInfraLogsParams {
  absoluteStart: number | undefined;
  absoluteEnd: number | undefined;
  bucketSize: BucketSize;
  hasData: boolean;
  lastUpdated: number;
  relativeStart: string;
  relativeEnd: string;
}

interface UseFetchInfraLogsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  logs: LogsFetchDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<LogsFetchDataResponse | undefined, unknown>>;
}

export function useFetchInfraLogs({
  absoluteStart,
  absoluteEnd,
  hasData,
  lastUpdated,
  relativeStart,
  relativeEnd,
  bucketSize,
}: UseFetchInfraLogsParams): UseFetchInfraLogsResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: [
      'fetchInfraLogs',
      { absoluteStart, absoluteEnd, bucketSize, lastUpdated, relativeStart, relativeEnd },
    ],
    queryFn: async () => {
      try {
        if (bucketSize && absoluteStart && absoluteEnd) {
          const response = await getDataHandler('infra_logs')?.fetchData({
            absoluteTime: { start: absoluteStart, end: absoluteEnd },
            relativeTime: { start: relativeStart, end: relativeEnd },
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

  return { isLoading, isSuccess, isError, logs: data, refetch };
}
