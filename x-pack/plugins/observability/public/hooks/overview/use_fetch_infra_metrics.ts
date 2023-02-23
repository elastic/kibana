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
import { MetricsFetchDataResponse } from '../../typings';

interface UseFetchInfraMetricsParams {
  absoluteStart: number | undefined;
  absoluteEnd: number | undefined;
  bucketSize: BucketSize;
  hasData: boolean;
  lastUpdated: number;
  relativeStart: string;
  relativeEnd: string;
}

interface UseFetchInfraMetricsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  metrics: MetricsFetchDataResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<MetricsFetchDataResponse | undefined, unknown>>;
}

export function useFetchInfraMetrics({
  absoluteStart,
  absoluteEnd,
  hasData,
  lastUpdated,
  relativeStart,
  relativeEnd,
  bucketSize,
}: UseFetchInfraMetricsParams): UseFetchInfraMetricsResponse {
  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: [
      'fetchInfraMetrics',
      { absoluteStart, absoluteEnd, bucketSize, lastUpdated, relativeStart, relativeEnd },
    ],
    queryFn: async () => {
      try {
        if (bucketSize && absoluteStart && absoluteEnd) {
          const response = await getDataHandler('infra_metrics')?.fetchData({
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

  return { isLoading, isSuccess, isError, metrics: data, refetch };
}
