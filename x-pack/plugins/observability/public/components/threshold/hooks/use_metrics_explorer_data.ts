/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  MetricsExplorerResponse,
  metricsExplorerResponseRT,
} from '../../../../common/threshold_rule/metrics_explorer';

import {
  MetricsExplorerOptions,
  MetricsExplorerTimestampsRT,
} from './use_metrics_explorer_options';
import { convertKueryToElasticSearchQuery } from '../helpers/kuery';
import { decodeOrThrow } from '../helpers/runtime_types';

export function useMetricsExplorerData(
  options: MetricsExplorerOptions,
  derivedIndexPattern: DataViewBase,
  { fromTimestamp, toTimestamp, interval, timeFieldName }: MetricsExplorerTimestampsRT,
  enabled = true
) {
  const { http } = useKibana().services;

  const { isLoading, data, error, refetch, fetchNextPage } = useInfiniteQuery<
    MetricsExplorerResponse,
    Error
  >({
    queryKey: ['metricExplorer', options, fromTimestamp, toTimestamp, derivedIndexPattern.title],
    queryFn: async ({ signal, pageParam = { afterKey: null } }) => {
      if (!fromTimestamp || !toTimestamp) {
        throw new Error('Unable to parse timerange');
      }
      if (!http) {
        throw new Error('HTTP service is unavailable');
      }
      if (!derivedIndexPattern.title) {
        throw new Error('Data view is unavailable');
      }

      const { afterKey } = pageParam;
      const response = await http.post<MetricsExplorerResponse>('/api/infra/metrics_explorer', {
        method: 'POST',
        body: JSON.stringify({
          forceInterval: options.forceInterval,
          dropLastBucket: options.dropLastBucket != null ? options.dropLastBucket : true,
          metrics: options.aggregation === 'count' ? [{ aggregation: 'count' }] : options.metrics,
          groupBy: options.groupBy,
          afterKey,
          limit: options.limit,
          indexPattern: derivedIndexPattern.title,
          filterQuery:
            (options.filterQuery &&
              convertKueryToElasticSearchQuery(options.filterQuery, derivedIndexPattern)) ||
            void 0,
          timerange: {
            interval,
            timeFieldName,
            from: fromTimestamp,
            to: toTimestamp,
          },
        }),
        signal,
      });

      return decodeOrThrow(metricsExplorerResponseRT)(response);
    },
    getNextPageParam: (lastPage) => lastPage.pageInfo,
    enabled: enabled && !!fromTimestamp && !!toTimestamp && !!http && !!derivedIndexPattern.title,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    error,
    fetchNextPage,
    isLoading,
    refetch,
  };
}
