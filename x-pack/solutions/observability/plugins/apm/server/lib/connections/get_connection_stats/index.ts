/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { merge } from 'lodash';
import { calculateThroughputWithRange } from '@kbn/apm-data-access-plugin/server/utils';
import type { ValuesType } from 'utility-types';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { withApmSpan } from '../../../utils/with_apm_span';
import type { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../helpers/get_random_sampler';
import { getDestinationMap } from './get_destination_map';
import { getStats } from './get_stats';

export function getConnectionStats({
  apmEventClient,
  start,
  end,
  numBuckets,
  filter,
  collapseBy,
  offset,
  randomSampler,
  withTimeseries = true,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  numBuckets: number;
  filter: QueryDslQueryContainer[];
  collapseBy: 'upstream' | 'downstream';
  offset?: string;
  randomSampler: RandomSampler;
  withTimeseries?: boolean;
}) {
  return withApmSpan('get_connection_stats_and_map', async () => {
    const [allMetrics, { nodesBydependencyName: destinationMap, sampled }] = await Promise.all([
      getStats({
        apmEventClient,
        start,
        end,
        filter,
        numBuckets,
        offset,
        withTimeseries,
      }),
      getDestinationMap({
        apmEventClient,
        start,
        end,
        filter,
        offset,
        randomSampler,
      }),
    ]);

    const statsWithLocationIds = allMetrics.map((statsItem) => {
      const { from, timeseries, value } = statsItem;
      const to = destinationMap.get(statsItem.to.dependencyName) ?? statsItem.to;

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

      return { ...merge({}, itemA, itemB), stats: statsA.concat(statsB) };
    });

    const statsItems = statsJoinedById.map((item) => {
      const mergedStats = item.stats.reduce<ValuesType<typeof item.stats>>(
        (prev, current) => {
          return {
            value: {
              latency_count: prev.value.latency_count + current.value.latency_count,
              latency_sum: prev.value.latency_sum + current.value.latency_sum,
              error_count: prev.value.error_count + current.value.error_count,
              success_count: prev.value.success_count + current.value.success_count,
            },
            timeseries:
              prev.timeseries && current.timeseries
                ? joinByKey([...prev.timeseries, ...current.timeseries], 'x', (a, b) => ({
                    x: a.x,
                    latency_count: a.latency_count + b.latency_count,
                    latency_sum: a.latency_sum + b.latency_sum,
                    error_count: a.error_count + b.error_count,
                    success_count: a.success_count + b.success_count,
                  }))
                : undefined,
          };
        },
        {
          value: {
            latency_count: 0,
            latency_sum: 0,
            error_count: 0,
            success_count: 0,
          },
          timeseries: [],
        }
      );

      const destStats = {
        latency: {
          value:
            mergedStats.value.latency_count > 0
              ? mergedStats.value.latency_sum / mergedStats.value.latency_count
              : null,
          timeseries: mergedStats.timeseries?.map((point) => ({
            x: point.x,
            y: point.latency_count > 0 ? point.latency_sum / point.latency_count : null,
          })),
        },
        totalTime: {
          value: mergedStats.value.latency_sum,
          timeseries: mergedStats.timeseries?.map((point) => ({
            x: point.x,
            y: point.latency_sum,
          })),
        },
        throughput: {
          value:
            mergedStats.value.latency_count > 0
              ? calculateThroughputWithRange({
                  start,
                  end,
                  value: mergedStats.value.latency_count,
                })
              : null,
          timeseries: mergedStats.timeseries?.map((point) => ({
            x: point.x,
            y:
              point.latency_count > 0
                ? calculateThroughputWithRange({
                    start,
                    end,
                    value: point.latency_count,
                  })
                : null,
          })),
        },
        errorRate: {
          value:
            mergedStats.value.error_count + mergedStats.value.success_count > 0
              ? (mergedStats.value.error_count ?? 0) /
                (mergedStats.value.error_count + mergedStats.value.success_count)
              : null,
          timeseries: mergedStats.timeseries?.map((point) => ({
            x: point.x,
            y:
              mergedStats.value.error_count + mergedStats.value.success_count > 0
                ? (point.error_count ?? 0) / (point.error_count + point.success_count)
                : null,
          })),
        },
      };

      return {
        ...item,
        stats: destStats,
      };
    });

    return { statsItems, sampled };
  });
}
