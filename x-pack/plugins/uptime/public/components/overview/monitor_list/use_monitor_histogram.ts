/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { useSelector } from 'react-redux';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useEsSearch } from '@kbn/observability-plugin/public';
import {
  Histogram,
  HistogramPoint,
  MonitorSummary,
} from '../../../../common/runtime_types/monitor';
import { useGetUrlParams } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';
import { esKuerySelector } from '../../../state/selectors';
import { getHistogramInterval } from '../../../../common/lib/get_histogram_interval';
import { Ping } from '../../../../common/runtime_types';

export const useMonitorHistogram = ({ items }: { items: MonitorSummary[] }) => {
  const { dateRangeStart, dateRangeEnd, statusFilter } = useGetUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const filters = useSelector(esKuerySelector);

  const monitorIds = (items ?? []).map(({ monitor_id: monitorId }) => monitorId);

  const { queryParams, minInterval } = getQueryParams(
    dateRangeStart,
    dateRangeEnd,
    filters,
    statusFilter,
    monitorIds
  );

  const { data, loading } = useEsSearch<Ping, typeof queryParams>(
    queryParams,
    [JSON.stringify(monitorIds), lastRefresh],
    {
      name: 'getMonitorDownHistory',
    }
  );

  const histogramBuckets = data?.aggregations?.histogram.buckets ?? [];
  // @ts-ignore 4.3.5 upgrade
  const simplified = histogramBuckets.map((histogramBucket) => {
    const byId: { [key: string]: number } = {};
    histogramBucket.by_id.buckets.forEach((idBucket) => {
      byId[idBucket.key] = idBucket.totalDown.value as number;
    });
    return {
      byId,
      timestamp: histogramBucket.key,
    };
  });

  const histogramsById: { [key: string]: Histogram } = {};
  monitorIds.forEach((id: string) => {
    const points: HistogramPoint[] = [];
    simplified.forEach(({ byId, timestamp }) => {
      points.push({
        timestamp,
        up: undefined,
        down: byId[id],
      });
    });
    histogramsById[id] = { points };
  });

  return { histogramsById, loading, minInterval };
};

const getQueryParams = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters: string,
  statusFilter: string,
  monitorIds: string[]
) => {
  const minInterval = getHistogramInterval(dateRangeStart, dateRangeEnd, 12);

  const queryParams = {
    index: 'heartbeat-*',
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                'summary.down': { gt: 0 },
              },
            },
            {
              terms: {
                'monitor.id': monitorIds,
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: dateRangeStart,
                  lte: dateRangeEnd,
                },
              },
            },
          ] as estypes.QueryDslQueryContainer,
        },
      },
      aggs: {
        histogram: {
          date_histogram: {
            field: '@timestamp',
            // 12 seems to be a good size for performance given
            // long monitor lists of up to 100 on the overview page
            fixed_interval: minInterval + 'ms',
          },
          aggs: {
            by_id: {
              terms: {
                field: 'monitor.id',
                size: Math.max(monitorIds.length, 1),
              },
              aggs: {
                totalDown: {
                  sum: { field: 'summary.down' },
                },
              },
            },
          },
        },
      },
    },
  };

  return { queryParams, minInterval };
};
