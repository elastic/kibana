/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import { useEffect, useState } from 'react';
import { DataViewBase } from '@kbn/es-query';
import { isEqual } from 'lodash';

import { MetricsSourceConfigurationProperties } from '../../../../../common/metrics_sources';
import {
  MetricsExplorerResponse,
  metricsExplorerResponseRT,
} from '../../../../../common/http_api/metrics_explorer';
import { convertKueryToElasticSearchQuery } from '../../../../utils/kuery';
import { MetricsExplorerOptions, MetricsExplorerTimeOptions } from './use_metrics_explorer_options';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { useTrackedPromise } from '../../../../utils/use_tracked_promise';

function isSameOptions(current: MetricsExplorerOptions, next: MetricsExplorerOptions) {
  return isEqual(current, next);
}

export function useMetricsExplorerData(
  options: MetricsExplorerOptions,
  source: MetricsSourceConfigurationProperties | undefined,
  derivedIndexPattern: DataViewBase,
  timerange: MetricsExplorerTimeOptions,
  afterKey: string | null | Record<string, string | null>,
  signal: any,
  shouldLoadImmediately = true
) {
  const kibana = useKibana();
  const fetchFn = kibana.services.http?.fetch;
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MetricsExplorerResponse | null>(null);
  const [lastOptions, setLastOptions] = useState<MetricsExplorerOptions | null>(null);
  const [lastTimerange, setLastTimerange] = useState<MetricsExplorerTimeOptions | null>(null);

  const from = DateMath.parse(timerange.from);
  const to = DateMath.parse(timerange.to, { roundUp: true });
  const [, makeRequest] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: () => {
        setLoading(true);
        if (!from || !to) {
          return Promise.reject(new Error('Unalble to parse timerange'));
        }
        if (!fetchFn) {
          return Promise.reject(new Error('HTTP service is unavailable'));
        }
        if (!source) {
          return Promise.reject(new Error('Source is unavailable'));
        }
        if (!fetchFn) {
          return Promise.reject(new Error('HTTP service is unavailable'));
        }

        return fetchFn('/api/infra/metrics_explorer', {
          method: 'POST',
          body: JSON.stringify({
            forceInterval: options.forceInterval,
            dropLastBucket: options.dropLastBucket != null ? options.dropLastBucket : true,
            metrics:
              options.aggregation === 'count'
                ? [{ aggregation: 'count' }]
                : options.metrics.map((metric) => ({
                    aggregation: metric.aggregation,
                    field: metric.field,
                  })),
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
        });
      },
      onResolve: (resp: unknown) => {
        setLoading(false);
        const response = decodeOrThrow(metricsExplorerResponseRT)(resp);
        if (response) {
          if (
            data &&
            lastOptions &&
            data.pageInfo.afterKey !== response.pageInfo.afterKey &&
            isSameOptions(lastOptions, options) &&
            isEqual(timerange, lastTimerange) &&
            afterKey
          ) {
            const { series } = data;
            setData({
              ...response,
              series: [...series, ...response.series],
            });
          } else {
            setData(response);
          }
          setLastOptions(options);
          setLastTimerange(timerange);
          setError(null);
        }
      },
      onReject: (e: unknown) => {
        setError(e as Error);
        setLoading(false);
      },
    },
    [source, timerange, options, signal, afterKey]
  );

  useEffect(() => {
    if (!shouldLoadImmediately) {
      return;
    }
    makeRequest();
  }, [makeRequest, shouldLoadImmediately]);
  return { error, loading, data, loadData: makeRequest };
}
