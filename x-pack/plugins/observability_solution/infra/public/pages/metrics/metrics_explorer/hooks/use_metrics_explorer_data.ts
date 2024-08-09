/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { InfraHttpError } from '../../../../types';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import {
  MetricsExplorerResponse,
  metricsExplorerResponseRT,
} from '../../../../../common/http_api/metrics_explorer';
import { convertKueryToElasticSearchQuery } from '../../../../utils/kuery';
import { MetricsExplorerOptions, MetricsExplorerTimestamp } from './use_metrics_explorer_options';

export function useMetricsExplorerData({
  options,
  timestamps: { fromTimestamp, toTimestamp, interval },
  enabled = true,
}: {
  options: MetricsExplorerOptions;
  timestamps: MetricsExplorerTimestamp;
  enabled?: boolean;
}) {
  const { http } = useKibana().services;
  const { metricsView } = useMetricsDataViewContext();

  const { isLoading, data, error, refetch, fetchNextPage } = useInfiniteQuery<
    MetricsExplorerResponse,
    InfraHttpError
  >({
    queryKey: ['metricExplorer', options, fromTimestamp, toTimestamp],
    queryFn: async ({ signal, pageParam = { afterKey: null } }) => {
      if (!fromTimestamp || !toTimestamp) {
        throw new Error('Unable to parse timerange');
      }
      if (!http) {
        throw new Error('HTTP service is unavailable');
      }
      if (!metricsView?.dataViewReference) {
        throw new Error('DataView is unavailable');
      }

      const { afterKey } = pageParam;
      const response = await http.post<MetricsExplorerResponse>('/api/infra/metrics_explorer', {
        method: 'POST',
        body: JSON.stringify({
          forceInterval: options.forceInterval,
          dropLastBucket: options.dropLastBucket != null ? options.dropLastBucket : true,
          metrics: options.aggregation === 'count' ? [{ aggregation: 'count' }] : options.metrics,
          groupBy: options.groupBy,
          groupInstance: options.groupInstance,
          afterKey,
          limit: options.limit,
          indexPattern: metricsView.indices,
          filterQuery:
            (options.filterQuery &&
              convertKueryToElasticSearchQuery(
                options.filterQuery,
                metricsView.dataViewReference
              )) ||
            void 0,
          timerange: {
            interval,
            from: fromTimestamp,
            to: toTimestamp,
          },
        }),
        signal,
      });

      return decodeOrThrow(metricsExplorerResponseRT)(response);
    },
    getNextPageParam: (lastPage) => lastPage.pageInfo,
    enabled: enabled && !!fromTimestamp && !!toTimestamp && !!http && !!metricsView,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    data,
    error: error?.body || error,
    fetchNextPage,
    isLoading,
    refetch,
  };
}
