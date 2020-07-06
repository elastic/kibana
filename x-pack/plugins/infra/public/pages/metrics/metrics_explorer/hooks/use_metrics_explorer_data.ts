/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { isEqual } from 'lodash';
import { useEffect, useState, useCallback } from 'react';
import { HttpHandler } from 'src/core/public';
import { IIndexPattern } from 'src/plugins/data/public';
import { SourceQuery } from '../../../../../common/graphql/types';
import {
  MetricsExplorerResponse,
  metricsExplorerResponseRT,
} from '../../../../../common/http_api/metrics_explorer';
import { convertKueryToElasticSearchQuery } from '../../../../utils/kuery';
import { MetricsExplorerOptions, MetricsExplorerTimeOptions } from './use_metrics_explorer_options';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { decodeOrThrow } from '../../../../../common/runtime_types';

function isSameOptions(current: MetricsExplorerOptions, next: MetricsExplorerOptions) {
  return isEqual(current, next);
}

export function useMetricsExplorerData(
  options: MetricsExplorerOptions,
  source: SourceQuery.Query['source']['configuration'] | undefined,
  derivedIndexPattern: IIndexPattern,
  timerange: MetricsExplorerTimeOptions,
  afterKey: string | null | Record<string, string | null>,
  signal: any,
  fetch?: HttpHandler,
  shouldLoadImmediately = true
) {
  const kibana = useKibana();
  const fetchFn = fetch ? fetch : kibana.services.http?.fetch;
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MetricsExplorerResponse | null>(null);
  const [lastOptions, setLastOptions] = useState<MetricsExplorerOptions | null>(null);
  const [lastTimerange, setLastTimerange] = useState<MetricsExplorerTimeOptions | null>(null);

  const loadData = useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const from = DateMath.parse(timerange.from);
        const to = DateMath.parse(timerange.to, { roundUp: true });
        if (!from || !to) {
          throw new Error('Unalble to parse timerange');
        }
        if (!fetchFn) {
          throw new Error('HTTP service is unavailable');
        }
        if (!source) {
          throw new Error('Source is unavailable');
        }
        const response = decodeOrThrow(metricsExplorerResponseRT)(
          await fetchFn('/api/infra/metrics_explorer', {
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
                field: source.fields.timestamp,
                from: from.valueOf(),
                to: to.valueOf(),
              },
            }),
          })
        );

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
      } catch (e) {
        setError(e);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, source, timerange, signal, afterKey]);

  useEffect(() => {
    if (!shouldLoadImmediately) {
      return;
    }

    loadData();
  }, [loadData, shouldLoadImmediately]);
  return { error, loading, data, loadData };
}
