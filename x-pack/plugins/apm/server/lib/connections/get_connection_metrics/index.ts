/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';
import { merge } from 'lodash';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { Setup } from '../../helpers/setup_request';
import { getMetrics } from './get_metrics';
import { getDestinationMap } from './get_destination_map';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Node } from '../../../../common/connections';

export function getConnectionMetrics({
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
  return withApmSpan('get_connection_metrics', async () => {
    const [allMetrics, destinationMap] = await Promise.all([
      getMetrics({
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

    const metricsWithLocationIds = allMetrics.map((metricItem) => {
      const { from, timeseries, value } = metricItem;
      let to: Node = metricItem.to;

      to = destinationMap.get(to.backendName) ?? to;

      const location = collapseBy === 'upstream' ? from : to;

      return {
        location,
        metrics: [{ timeseries, value }],
        id: location.id,
      };
    }, []);

    const metricsJoinedById = joinByKey(
      metricsWithLocationIds,
      'id',
      (a, b) => {
        const { metrics: metricsA, ...itemA } = a;
        const { metrics: metricsB, ...itemB } = b;

        return merge({}, itemA, itemB, { metrics: metricsA.concat(metricsB) });
      }
    );

    const metricItems = metricsJoinedById.map((item) => {
      const mergedMetrics = item.metrics.reduce<
        ValuesType<typeof item.metrics>
      >(
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

      const destMetrics = {
        latency: {
          value:
            mergedMetrics.value.count > 0
              ? mergedMetrics.value.latency_sum / mergedMetrics.value.count
              : null,
          timeseries: mergedMetrics.timeseries.map((point) => ({
            x: point.x,
            y: point.count > 0 ? point.latency_sum / point.count : null,
          })),
        },
        throughput: {
          value:
            mergedMetrics.value.count > 0
              ? calculateThroughput({
                  start,
                  end,
                  value: mergedMetrics.value.count,
                })
              : null,
          timeseries: mergedMetrics.timeseries.map((point) => ({
            x: point.x,
            y:
              point.count > 0
                ? calculateThroughput({ start, end, value: point.count })
                : null,
          })),
        },
        errorRate: {
          value:
            mergedMetrics.value.count > 0
              ? (mergedMetrics.value.error_count ?? 0) /
                mergedMetrics.value.count
              : null,
          timeseries: mergedMetrics.timeseries.map((point) => ({
            x: point.x,
            y: point.count > 0 ? (point.error_count ?? 0) / point.count : null,
          })),
        },
      };

      return {
        ...item,
        metrics: destMetrics,
      };
    });

    return metricItems;
  });
}
