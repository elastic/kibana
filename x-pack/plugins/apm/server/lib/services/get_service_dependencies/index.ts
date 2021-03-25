/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';
import { merge } from 'lodash';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { Coordinate } from '../../../../typings/timeseries';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/elasticsearch_fieldnames';
import { maybe } from '../../../../common/utils/maybe';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getMetrics } from './get_metrics';
import { getDestinationMap } from './get_destination_map';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import { withApmSpan } from '../../../utils/with_apm_span';
import { offsetPreviousPeriodCoordinates } from '../../../utils/offset_previous_period_coordinate';

interface Metrics {
  latency: { value: number | null; timeseries: Coordinate[] };
  throughput: { value: number | null; timeseries: Coordinate[] };
  errorRate: { value: number | null; timeseries: Coordinate[] };
  impact: number;
}

export type ServiceDependencyItem = {
  name: string;
  currentPeriod: Metrics;
  previousPeriod: Metrics;
} & (
  | {
      type: 'service';
      serviceName: string;
      agentName: AgentName;
      environment?: string;
    }
  | { type: 'external'; spanType?: string; spanSubtype?: string }
);

type GetMetricsResponse = PromiseReturnType<typeof getMetrics>[0];
type PeriodsMetrics =
  | GetMetricsResponse['previousPeriod']
  | GetMetricsResponse['currentPeriod'];
function reduceMetrics(acc: PeriodsMetrics, current: PeriodsMetrics) {
  return {
    value: {
      count: acc.value.count + current.value.count,
      latency_sum: acc.value.latency_sum + current.value.latency_sum,
      error_count: acc.value.error_count + current.value.error_count,
    },
    timeseries: joinByKey(
      [...acc.timeseries, ...current.timeseries],
      'x',
      (a, b) => ({
        x: a.x,
        count: a.count + b.count,
        latency_sum: a.latency_sum + b.latency_sum,
        error_count: a.error_count + b.error_count,
      })
    ),
  };
}

function getDestinationMetrics({
  start,
  end,
  metrics,
}: {
  start: number;
  end: number;
  metrics: ReturnType<typeof reduceMetrics>;
}) {
  return {
    latency: {
      value:
        metrics.value.count > 0
          ? metrics.value.latency_sum / metrics.value.count
          : null,
      timeseries: metrics.timeseries.map((point) => ({
        x: point.x,
        y: point.count > 0 ? point.latency_sum / point.count : null,
      })),
    },
    throughput: {
      value:
        metrics.value.count > 0
          ? calculateThroughput({
              start,
              end,
              value: metrics.value.count,
            })
          : null,
      timeseries: metrics.timeseries.map((point) => ({
        x: point.x,
        y:
          point.count > 0
            ? calculateThroughput({ start, end, value: point.count })
            : null,
      })),
    },
    errorRate: {
      value:
        metrics.value.count > 0
          ? (metrics.value.error_count ?? 0) / metrics.value.count
          : null,
      timeseries: metrics.timeseries.map((point) => ({
        x: point.x,
        y: point.count > 0 ? (point.error_count ?? 0) / point.count : null,
      })),
    },
  };
}

function calculateImpact({
  latency,
  throughput,
  minLatency,
  maxLatency,
}: {
  latency: number | null;
  throughput: number | null;
  minLatency: number;
  maxLatency: number;
}) {
  return isFiniteNumber(latency) && isFiniteNumber(throughput)
    ? ((latency * throughput - minLatency) / (maxLatency - minLatency)) * 100
    : 0;
}

export function getServiceDependencies({
  setup,
  serviceName,
  environment,
  numBuckets,
  comparisonStart,
  comparisonEnd,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  environment?: string;
  numBuckets: number;
  comparisonStart: number;
  comparisonEnd: number;
}): Promise<ServiceDependencyItem[]> {
  return withApmSpan('get_service_dependencies', async () => {
    const { start, end } = setup;
    const [allMetrics, destinationMap] = await Promise.all([
      getMetrics({
        setup,
        serviceName,
        environment,
        numBuckets,
        comparisonStart,
        comparisonEnd,
      }),
      getDestinationMap({
        setup,
        serviceName,
        environment,
      }),
    ]);

    const metricsWithDestinationIds = allMetrics.map((metricItem) => {
      const spanDestination = metricItem.span.destination.service.resource;

      const destination = maybe(destinationMap[spanDestination]);
      const id = destination?.id || {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: spanDestination,
      };

      return merge(
        {
          id,
          metrics: [metricItem],
          span: {
            destination: {
              service: {
                resource: spanDestination,
              },
            },
          },
        },
        destination
      );
    }, []);

    const metricsJoinedByDestinationId = joinByKey(
      metricsWithDestinationIds,
      'id',
      (a, b) => {
        const { metrics: metricsA, ...itemA } = a;
        const { metrics: metricsB, ...itemB } = b;

        return merge({}, itemA, itemB, { metrics: metricsA.concat(metricsB) });
      }
    );

    const metricsByResolvedAddress = metricsJoinedByDestinationId.map(
      (item) => {
        const mergedMetrics = item.metrics.reduce<
          Omit<ValuesType<typeof item.metrics>, 'span'>
        >(
          (prev, current) => {
            return {
              currentPeriod: reduceMetrics(
                prev.currentPeriod,
                current.currentPeriod
              ),
              previousPeriod: reduceMetrics(
                prev.previousPeriod,
                current.previousPeriod
              ),
            };
          },
          {
            currentPeriod: {
              value: { count: 0, latency_sum: 0, error_count: 0 },
              timeseries: [],
            },
            previousPeriod: {
              value: { count: 0, latency_sum: 0, error_count: 0 },
              timeseries: [],
            },
          }
        );

        const destMetrics = getDestinationMetrics({
          start,
          end,
          metrics: mergedMetrics.currentPeriod,
        });

        const previousPeriodDestMetrics = getDestinationMetrics({
          start,
          end,
          metrics: mergedMetrics.previousPeriod,
        });

        if (item.service) {
          return {
            name: item.service.name,
            type: 'service' as const,
            serviceName: item.service.name,
            environment: item.service.environment,
            // agent.name should always be there, type returned from joinByKey is too pessimistic
            agentName: item.agent!.name,
            currentPeriod: destMetrics,
            previousPeriod: previousPeriodDestMetrics,
          };
        }

        return {
          name: item.span.destination.service.resource,
          type: 'external' as const,
          spanType: item.span.type,
          spanSubtype: item.span.subtype,
          currentPeriod: destMetrics,
          previousPeriod: previousPeriodDestMetrics,
        };
      }
    );

    const currentPeriodLatencySums = metricsByResolvedAddress
      .map(
        (metric) =>
          (metric.currentPeriod.latency.value ?? 0) *
          (metric.currentPeriod.throughput.value ?? 0)
      )
      .filter(isFiniteNumber);

    const currentPeriodMinLatencySum = Math.min(...currentPeriodLatencySums);
    const currentPeriodMaxLatencySum = Math.max(...currentPeriodLatencySums);

    const previousPeriodLatencySums = metricsByResolvedAddress
      .map(
        (metric) =>
          (metric.previousPeriod.latency.value ?? 0) *
          (metric.previousPeriod.throughput.value ?? 0)
      )
      .filter(isFiniteNumber);

    const previousPeriodMinLatencySum = Math.min(...previousPeriodLatencySums);
    const previousPeriodMaxLatencySum = Math.max(...previousPeriodLatencySums);

    return metricsByResolvedAddress.map((metric) => {
      const { currentPeriod, previousPeriod, ...rest } = metric;

      const currentPeriodImpact = calculateImpact({
        latency: currentPeriod.latency.value,
        throughput: currentPeriod.throughput.value,
        minLatency: currentPeriodMinLatencySum,
        maxLatency: currentPeriodMaxLatencySum,
      });

      const previousPeriodImpact = calculateImpact({
        latency: previousPeriod.latency.value,
        throughput: previousPeriod.throughput.value,
        minLatency: previousPeriodMinLatencySum,
        maxLatency: previousPeriodMaxLatencySum,
      });

      return {
        ...rest,
        currentPeriod: { ...currentPeriod, impact: currentPeriodImpact },
        previousPeriod: {
          latency: {
            ...previousPeriod.latency,
            timeseries: offsetPreviousPeriodCoordinates({
              currentPeriodTimeseries: currentPeriod.latency.timeseries,
              previousPeriodTimeseries: previousPeriod.latency.timeseries,
            }),
          },
          throughput: {
            ...previousPeriod.throughput,
            timeseries: offsetPreviousPeriodCoordinates({
              currentPeriodTimeseries: currentPeriod.throughput.timeseries,
              previousPeriodTimeseries: previousPeriod.throughput.timeseries,
            }),
          },
          errorRate: {
            ...previousPeriod.errorRate,
            timeseries: offsetPreviousPeriodCoordinates({
              currentPeriodTimeseries: currentPeriod.errorRate.timeseries,
              previousPeriodTimeseries: previousPeriod.errorRate.timeseries,
            }),
          },
          impact: previousPeriodImpact,
        },
      };
    });
  });
}
