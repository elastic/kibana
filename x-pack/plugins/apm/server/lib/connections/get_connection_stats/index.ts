/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';
import { merge } from 'lodash';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { Setup } from '../../helpers/setup_request';
import { getStats } from './get_stats';
import { getDestinationMap } from './get_destination_map';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import { withApmSpan } from '../../../utils/with_apm_span';

export function getConnectionStats({
  setup,
  start,
  end,
  numBuckets,
  filter,
  collapseBy,
  offset,
}: {
  setup: Setup;
  start: number;
  end: number;
  numBuckets: number;
  filter: QueryDslQueryContainer[];
  collapseBy: 'upstream' | 'downstream';
  offset?: string;
}) {
  return withApmSpan('get_connection_stats_and_map', async () => {
    const [allMetrics, destinationMap] = await Promise.all([
      getStats({
        setup,
        start,
        end,
        filter,
        numBuckets,
        offset,
      }),
      getDestinationMap({
        setup,
        start,
        end,
        filter,
        offset,
      }),
    ]);

    const statsWithLocationIds = allMetrics.map((statsItem) => {
      const { from, timeseries, value } = statsItem;
      const to = destinationMap.get(statsItem.to.backendName) ?? statsItem.to;

      const location = collapseBy === 'upstream' ? from : to;

      return {
        location,
        stats: [{ timeseries, value }],
        id: location.id,
      };
    }, []);

    const statsJoinedById = joinByKey(statsWithLocationIds, 'id', (a, b) => {
      const { stats: statsA, ...itemA } = a;
      const { stats: statsB, ...itemB } = b;

      return merge({}, itemA, itemB, { stats: statsA.concat(statsB) });
    });

    const statsItems = statsJoinedById.map((item) => {
      const mergedStats = item.stats.reduce<ValuesType<typeof item.stats>>(
        (prev, current) => {
          return {
            value: {
              count: prev.value.count + current.value.count,
              latency_sum: prev.value.latency_sum + current.value.latency_sum,
              error_count: prev.value.error_count + current.value.error_count,
            },
            timeseries: joinByKey(
              [...prev.timeseries, ...current.timeseries],
              'x',
              (a, b) => ({
                x: a.x,
                count: a.count + b.count,
                latency_sum: a.latency_sum + b.latency_sum,
                error_count: a.error_count + b.error_count,
              })
            ),
          };
        },
        {
          value: {
            count: 0,
            latency_sum: 0,
            error_count: 0,
          },
          timeseries: [],
        }
      );

      const destStats = {
        latency: {
          value:
            mergedStats.value.count > 0
              ? mergedStats.value.latency_sum / mergedStats.value.count
              : null,
          timeseries: mergedStats.timeseries.map((point) => ({
            x: point.x,
            y: point.count > 0 ? point.latency_sum / point.count : null,
          })),
        },
        totalTime: {
          value: mergedStats.value.latency_sum,
          timeseries: mergedStats.timeseries.map((point) => ({
            x: point.x,
            y: point.latency_sum,
          })),
        },
        throughput: {
          value:
            mergedStats.value.count > 0
              ? calculateThroughput({
                  start,
                  end,
                  value: mergedStats.value.count,
                })
              : null,
          timeseries: mergedStats.timeseries.map((point) => ({
            x: point.x,
            y:
              point.count > 0
                ? calculateThroughput({ start, end, value: point.count })
                : null,
          })),
        },
        errorRate: {
          value:
            mergedStats.value.count > 0
              ? (mergedStats.value.error_count ?? 0) / mergedStats.value.count
              : null,
          timeseries: mergedStats.timeseries.map((point) => ({
            x: point.x,
            y: point.count > 0 ? (point.error_count ?? 0) / point.count : null,
          })),
        },
      };

      return {
        ...item,
        stats: destStats,
      };
    });

    return statsItems;
  });
}
