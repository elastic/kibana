/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

export function useDurationRange() {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  const { data, loading } = useEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN + ',remote_cluster:heartbeat-*',
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                exists: {
                  field: 'summary',
                },
              },
              {
                term: {
                  'monitor.id': monitorId,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gt: 'now-30d/d',
                    lt: 'now',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          byTime: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '3h',
            },
            aggs: {
              duration: {
                stats: {
                  field: 'monitor.duration.us',
                },
              },
              percentiles: {
                percentiles: {
                  field: 'monitor.duration.us',
                  percents: [25, 50, 75, 95, 99],
                },
              },
            },
          },
        },
      },
    },
    [lastRefresh, monitorId],
    { name: 'getMonitorDurationRange' }
  );

  return useMemo(() => {
    const timeSeries = (data?.aggregations?.byTime.buckets ?? []).map((bucket) => {
      return {
        x: bucket.key,
        min: (bucket.duration.min ?? 0) / 1000,
        max: (bucket.duration.max ?? 0) / 1000,
        '25th': (bucket.percentiles.values['25.0'] ?? 0) / 1000,
        '50th': (bucket.percentiles.values['50.0'] ?? 0) / 1000,
        '75th': (bucket.percentiles.values['75.0'] ?? 0) / 1000,
        '95th': (bucket.percentiles.values['95.0'] ?? 0) / 1000,
        '99th': (bucket.percentiles.values['99.0'] ?? 0) / 1000,
      };
    });

    return { timeSeries, loading };
  }, [data, loading]);
}
