/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { ValuesType } from 'utility-types';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/elasticsearch_fieldnames';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { maybe } from '../../../../common/utils/maybe';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { offsetPreviousPeriodCoordinates } from '../../../utils/offset_previous_period_coordinate';
import { withApmSpan } from '../../../utils/with_apm_span';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getDestinationMap } from './get_destination_map';
import { getMetrics } from './get_metrics';

export type ServiceDependencyItem = {
  name: string;
  latency: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }>;
  };
  throughput: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }>;
  };
  errorRate: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }>;
  };
  impact: number;
} & (
  | {
      type: 'service';
      serviceName: string;
      agentName: AgentName;
      environment?: string;
    }
  | { type: 'external'; spanType?: string; spanSubtype?: string }
);

function getServiceDependencies({
  setup,
  serviceName,
  environment,
  numBuckets,
  start,
  end,
}: {
  serviceName: string;
  setup: Setup;
  environment?: string;
  numBuckets: number;
  start: number;
  end: number;
}): Promise<ServiceDependencyItem[]> {
  return withApmSpan('get_service_dependencies', async () => {
    const [allMetrics, destinationMap] = await Promise.all([
      getMetrics({
        setup,
        serviceName,
        environment,
        numBuckets,
        start,
        end,
      }),
      getDestinationMap({
        setup,
        serviceName,
        environment,
        start,
        end,
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
              y:
                point.count > 0 ? (point.error_count ?? 0) / point.count : null,
            })),
          },
        };

        if (item.service) {
          return {
            name: item.service.name,
            type: 'service' as const,
            serviceName: item.service.name,
            environment: item.service.environment,
            // agent.name should always be there, type returned from joinByKey is too pessimistic
            agentName: item.agent!.name,
            ...destMetrics,
          };
        }

        return {
          name: item.span.destination.service.resource,
          type: 'external' as const,
          spanType: item.span.type,
          spanSubtype: item.span.subtype,
          ...destMetrics,
        };
      }
    );

    const latencySums = metricsByResolvedAddress
      .map(
        (metric) => (metric.latency.value ?? 0) * (metric.throughput.value ?? 0)
      )
      .filter(isFiniteNumber);

    const minLatencySum = Math.min(...latencySums);
    const maxLatencySum = Math.max(...latencySums);

    return metricsByResolvedAddress.map((metric) => {
      const impact =
        isFiniteNumber(metric.latency.value) &&
        isFiniteNumber(metric.throughput.value)
          ? ((metric.latency.value * metric.throughput.value - minLatencySum) /
              (maxLatencySum - minLatencySum)) *
            100
          : 0;

      return {
        ...metric,
        impact,
      };
    });
  });
}

export async function getServiceDependenciesPeriods({
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
  comparisonStart?: number;
  comparisonEnd?: number;
}) {
  return withApmSpan('get_service_dependencies_periods', async () => {
    const { start, end } = setup;

    const commonProps = {
      serviceName,
      environment,
      setup,
      numBuckets,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceDependencies({
        ...commonProps,
        start,
        end,
      }),
      ...(comparisonStart && comparisonEnd
        ? [
            getServiceDependencies({
              ...commonProps,
              start: comparisonStart,
              end: comparisonEnd,
            }),
          ]
        : []),
    ]);

    return {
      serviceDependencies: currentPeriod.map((currentDependency) => {
        const previousDependency = previousPeriod?.find(
          (item) => item.name === currentDependency.name
        );
        if (!previousDependency) {
          return currentDependency;
        }

        return {
          ...currentDependency,
          latency: {
            ...currentDependency.latency,
            previousPeriodTimeseries: offsetPreviousPeriodCoordinates({
              currentPeriodTimeseries: currentDependency.latency.timeseries,
              previousPeriodTimeseries: previousDependency.latency?.timeseries,
            }),
          },
          throughput: {
            ...currentDependency.throughput,
            previousPeriodTimeseries: offsetPreviousPeriodCoordinates({
              currentPeriodTimeseries: currentDependency.throughput.timeseries,
              previousPeriodTimeseries:
                previousDependency.throughput?.timeseries,
            }),
          },
          errorRate: {
            ...currentDependency.errorRate,
            previousPeriodTimeseries: offsetPreviousPeriodCoordinates({
              currentPeriodTimeseries: currentDependency.errorRate.timeseries,
              previousPeriodTimeseries:
                previousDependency.errorRate?.timeseries,
            }),
          },
        };
      }),
    };
  });
}
