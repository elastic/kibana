/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import { DataViewBase } from '@kbn/es-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { MetricsSourceConfigurationProperties } from '../../../../../common/metrics_sources';
import {
  MetricsExplorerResponse,
  metricsExplorerResponseRT,
} from '../../../../../common/http_api/metrics_explorer';
import { convertKueryToElasticSearchQuery } from '../../../../utils/kuery';
import { MetricsExplorerOptions, MetricsExplorerTimeOptions } from './use_metrics_explorer_options';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export function useMetricsExplorerData(
  options: MetricsExplorerOptions,
  source: MetricsSourceConfigurationProperties | undefined,
  derivedIndexPattern: DataViewBase,
  timerange: MetricsExplorerTimeOptions
) {
  const { http } = useKibana().services;

  const from = DateMath.parse(timerange.from);
  const to = DateMath.parse(timerange.to, { roundUp: true });
  const { isInitialLoading, isLoading, isRefetching, data, error, refetch, fetchNextPage } =
    useInfiniteQuery<MetricsExplorerResponse, Error>({
      queryKey: ['metricExplorer', options.aggregation, options, timerange],
      queryFn: async ({ signal, pageParam = { afterKey: null } }) => {
        if (!from || !to) {
          throw new Error('Unable to parse timerange');
        }
        if (!http) {
          throw new Error('HTTP service is unavailable');
        }
        if (!source) {
          throw new Error('Source is unavailable');
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
            indexPattern: source.metricAlias,
            filterQuery:
              (options.filterQuery &&
                convertKueryToElasticSearchQuery(options.filterQuery, derivedIndexPattern)) ||
              void 0,
            timerange: {
              ...timerange,
              from: from.valueOf(),
              to: to.valueOf(),
            },
          }),
          signal,
        });

        return decodeOrThrow(metricsExplorerResponseRT)(response);
      },
      getNextPageParam: (lastPage) => lastPage.pageInfo,
      enabled: !!from && !!to && !!http && !!source,
      refetchOnWindowFocus: false,
    });

  return {
    data,
    isLoading: isInitialLoading || isLoading || isRefetching,
    loadData: refetch,
    error,
    fetchNextPage,
  };
}
