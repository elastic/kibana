/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { isEqual } from 'lodash';
import { useEffect, useState } from 'react';
import { IIndexPattern } from 'src/plugins/data/public';
import { SourceQuery } from '../../../common/graphql/types';
import {
  MetricsExplorerResponse,
  metricsExplorerResponseRT,
} from '../../../common/http_api/metrics_explorer';
import { convertKueryToElasticSearchQuery } from '../../utils/kuery';
import { MetricsExplorerOptions, MetricsExplorerTimeOptions } from './use_metrics_explorer_options';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { decodeOrThrow } from '../../../common/runtime_types';

function isSameOptions(current: MetricsExplorerOptions, next: MetricsExplorerOptions) {
  return isEqual(current, next);
}

export function useMetricsExplorerData(
  options: MetricsExplorerOptions,
  source: SourceQuery.Query['source']['configuration'],
  derivedIndexPattern: IIndexPattern,
  timerange: MetricsExplorerTimeOptions,
  afterKey: string | null,
  signal: any
) {
  const fetch = useKibana().services.http?.fetch;
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MetricsExplorerResponse | null>(null);
  const [lastOptions, setLastOptions] = useState<MetricsExplorerOptions | null>(null);
  const [lastTimerange, setLastTimerange] = useState<MetricsExplorerTimeOptions | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const from = DateMath.parse(timerange.from);
        const to = DateMath.parse(timerange.to, { roundUp: true });
        if (!from || !to) {
          throw new Error('Unalble to parse timerange');
        }
        if (!fetch) {
          throw new Error('HTTP service is unavailable');
        }
        const response = decodeOrThrow(metricsExplorerResponseRT)(
          await fetch('/api/infra/metrics_explorer', {
            method: 'POST',
            body: JSON.stringify({
              metrics:
                options.aggregation === 'count'
                  ? [{ aggregation: 'count' }]
                  : options.metrics.map(metric => ({
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

    // TODO: fix this dependency list while preserving the semantics
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, source, timerange, signal, afterKey]);
  return { error, loading, data };
}
