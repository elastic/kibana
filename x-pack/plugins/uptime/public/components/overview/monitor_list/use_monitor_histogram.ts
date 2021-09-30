/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { useSelector } from 'react-redux';
import {
  Histogram,
  HistogramPoint,
  MonitorSummary,
} from '../../../../common/runtime_types/monitor';
import { useGetUrlParams } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';
import { useEsSearch, createEsParams } from '../../../../../observability/public';
import { esKuerySelector } from '../../../state/selectors';
import { getHistogramInterval } from '../../../../common/lib/get_histogram_interval';
import { Ping } from '../../../../common/runtime_types';

export const useMonitorHistogram = ({ items }: { items: MonitorSummary[] }) => {
  const { dateRangeStart, dateRangeEnd, statusFilter, query } = useGetUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const filters = useSelector(esKuerySelector);

  const monitorIds = (items ?? []).map(({ monitor_id: monitorId }) => monitorId);

  const queryParams = getQueryParams(
    dateRangeStart,
    dateRangeEnd,
    filters,
    statusFilter,
    monitorIds
  );

  const { data, loading } = useEsSearch<Ping, typeof queryParams>(queryParams, [
    JSON.stringify(monitorIds),
    lastRefresh,
  ]);

  const histoBuckets = data?.aggregations?.histogram.buckets ?? [];
  const simplified = histoBuckets.map((histoBucket: any): { timestamp: number; byId: any } => {
    const byId: { [key: string]: number } = {};
    histoBucket.by_id.buckets.forEach((idBucket: any) => {
      byId[idBucket.key] = idBucket.totalDown.value;
    });
    return {
      timestamp: parseInt(histoBucket.key, 10),
      byId,
    };
  });

  const histosById: { [key: string]: Histogram } = {};
  monitorIds.forEach((id: string) => {
    const points: HistogramPoint[] = [];
    simplified.forEach((simpleHisto) => {
      points.push({
        timestamp: simpleHisto.timestamp,
        up: undefined,
        down: simpleHisto.byId[id],
      });
    });
    histosById[id] = { points };
  });

  return histosById;
};

const getQueryParams = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters: string,
  statusFilter: string,
  monitorIds: string[]
) => {
  const minInterval = getHistogramInterval(dateRangeStart, dateRangeEnd, 12);

  return createEsParams({
    index: 'heartbeat-*',
    body: {
      size: 0,
      query: {``
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
          ],
        },
      },
      aggs: {
        histogram: {
          date_histogram: {
            field: '@timestamp',
            // 12 seems to be a good size for performance given
            // long monitor lists of up to 100 on the overview page
            // fixed_interval: minInterval + 'ms',
          },
          // aggs: {
          //   by_id: {
          //     terms: {
          //       field: 'monitor.id',
          //       size: Math.max(monitorIds.length, 1),
          //     },
          //     aggs: {
          //       totalDown: {
          //         sum: { field: 'summary.down' },
          //       },
          //     },
          //   },
          // },
        },
      },
    },
  });
};
