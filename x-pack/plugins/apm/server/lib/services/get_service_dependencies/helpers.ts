/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { ValuesType } from 'utility-types';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/elasticsearch_fieldnames';
import { maybe } from '../../../../common/utils/maybe';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { getDestinationMap } from './get_destination_map';
import { getMetrics } from './get_metrics';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import { offsetPreviousPeriodCoordinates } from '../../../utils/offset_previous_period_coordinate';

export function getMetricsWithDestinationIds({
  destinationMap,
  currentPeriodMetrics,
  previousPeriodMetrics,
}: {
  destinationMap: PromiseReturnType<typeof getDestinationMap>;
  currentPeriodMetrics: PromiseReturnType<typeof getMetrics>;
  previousPeriodMetrics: PromiseReturnType<typeof getMetrics>;
}) {
  return currentPeriodMetrics.map((metricItem) => {
    const spanDestination = metricItem.span.destination.service.resource;

    const previousMetrics = previousPeriodMetrics.find(
      (previousMetric) =>
        previousMetric.span.destination.service.resource === spanDestination
    );

    const destination = maybe(destinationMap[spanDestination]);
    const id = destination?.id || {
      [SPAN_DESTINATION_SERVICE_RESOURCE]: spanDestination,
    };

    return merge(
      {
        id,
        metrics: [metricItem],
        previousMetrics: previousMetrics ? [previousMetrics] : [],
        span: { destination: { service: { resource: spanDestination } } },
      },
      destination
    );
  }, []);
}

export function joinMetricsByDestinationId(
  metricsWithDestinationIds: ReturnType<typeof getMetricsWithDestinationIds>
) {
  return joinByKey(metricsWithDestinationIds, 'id', (a, b) => {
    const { metrics: metricsA, ...itemA } = a;
    const { metrics: metricsB, ...itemB } = b;

    return merge({}, itemA, itemB, {
      metrics: metricsA.concat(metricsB),
    });
  });
}

export function calculateMetricValues(
  metrics:
    | ReturnType<typeof joinMetricsByDestinationId>[0]['metrics']
    | ReturnType<typeof joinMetricsByDestinationId>[0]['previousMetrics']
) {
  return metrics.reduce<Omit<ValuesType<typeof metrics>, 'span'>>(
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
      value: { count: 0, latency_sum: 0, error_count: 0 },
      timeseries: [],
    }
  );
}

export function calculateDestinationMetrics({
  mergedMetrics,
  start,
  end,
}: {
  mergedMetrics: ReturnType<typeof calculateMetricValues>;
  start: number;
  end: number;
}) {
  return {
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
            ? calculateThroughput({
                start,
                end,
                value: point.count,
              })
            : null,
      })),
    },
    errorRate: {
      value:
        mergedMetrics.value.count > 0
          ? (mergedMetrics.value.error_count ?? 0) / mergedMetrics.value.count
          : null,
      timeseries: mergedMetrics.timeseries.map((point) => ({
        x: point.x,
        y: point.count > 0 ? (point.error_count ?? 0) / point.count : null,
      })),
    },
  };
}

export function offsetPreviousMetrics({
  currentDestinationMetrics,
  previousDestinationMetrics,
}: {
  currentDestinationMetrics: ReturnType<typeof calculateDestinationMetrics>;
  previousDestinationMetrics?: ReturnType<typeof calculateDestinationMetrics>;
}) {
  return previousDestinationMetrics
    ? {
        latency: {
          ...previousDestinationMetrics.latency,
          timeseries: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries:
              currentDestinationMetrics.latency.timeseries,
            previousPeriodTimeseries:
              previousDestinationMetrics.latency.timeseries,
          }),
        },
        throughput: {
          ...previousDestinationMetrics.throughput,
          timeseries: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries:
              currentDestinationMetrics.throughput.timeseries,
            previousPeriodTimeseries:
              previousDestinationMetrics.throughput.timeseries,
          }),
        },
        errorRate: {
          ...previousDestinationMetrics.errorRate,
          timeseries: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries:
              currentDestinationMetrics.errorRate.timeseries,
            previousPeriodTimeseries:
              previousDestinationMetrics.errorRate.timeseries,
          }),
        },
      }
    : {};
}

export function getCalculateImpact(latencySums: number[]) {
  const minLatencySum = Math.min(...latencySums);
  const maxLatencySum = Math.max(...latencySums);

  return ({
    latencyValue,
    throughputValue,
  }: {
    latencyValue: number | null;
    throughputValue: number | null;
  }) => {
    const previousImpact =
      isFiniteNumber(latencyValue) && isFiniteNumber(throughputValue)
        ? ((latencyValue * throughputValue - minLatencySum) /
            (maxLatencySum - minLatencySum)) *
          100
        : 0;
    return previousImpact;
  };
}
