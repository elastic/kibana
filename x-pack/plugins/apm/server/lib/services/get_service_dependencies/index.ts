/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getMetrics } from './get_metrics';
import { getDestinationMap } from './get_destination_map';

export interface ServiceDependencyItem {
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
  serviceName?: string;
  environment?: string;
  spanType?: string;
  spanSubtype?: string;
  agentName?: AgentName;
}

export async function getServiceDependencies({
  setup,
  serviceName,
  environment,
  numBuckets,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  environment: string;
  numBuckets: number;
}): Promise<ServiceDependencyItem[]> {
  const { start, end } = setup;

  const [allMetrics, destinationMap] = await Promise.all([
    getMetrics({
      setup,
      serviceName,
      environment,
      numBuckets,
    }),
    getDestinationMap({
      setup,
      serviceName,
      environment,
    }),
  ]);

  const metricsWithMappedDestinations = allMetrics.map((metricItem) => {
    const spanDestination = metricItem.key;

    const destination = destinationMap[spanDestination];

    const defaultInfo = {
      span: {
        destination: {
          service: {
            resource: metricItem.key,
          },
        },
      },
    };

    return {
      destination: destination ? destination : defaultInfo,
      metrics: [metricItem],
    };
  }, []);

  const metricsJoinedByDestination = joinByKey(
    metricsWithMappedDestinations,
    'destination',
    (a, b) => ({
      ...a,
      ...b,
      metrics: [...a.metrics, ...b.metrics],
    })
  );

  const metricsByResolvedAddress = metricsJoinedByDestination.map(
    ({ destination, metrics }) => {
      const mergedMetrics = metrics.reduce<
        Omit<ValuesType<typeof metrics>, 'key'>
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

      const deltaAsMinutes = (end - start) / 60 / 1000;

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
              ? mergedMetrics.value.count / deltaAsMinutes
              : null,
          timeseries: mergedMetrics.timeseries.map((point) => ({
            x: point.x,
            y: point.count > 0 ? point.count / deltaAsMinutes : null,
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

      if ('service' in destination) {
        return {
          name: destination.service.name,
          serviceName: destination.service.name,
          environment: destination.service.environment,
          agentName: destination.agent.name,
          ...destMetrics,
        };
      }

      return {
        name: destination.span.destination.service.resource!,
        ...('span' in destination && 'type' in destination.span
          ? {
              spanType: destination.span.type,
              spanSubtype: destination.span.subtype,
            }
          : {}),
        ...destMetrics,
      };
    }
  );

  const latencySums = metricsByResolvedAddress
    .map((metrics) => metrics.latency.value)
    .filter(isFiniteNumber);

  const minLatencySum = Math.min(...latencySums);
  const maxLatencySum = Math.max(...latencySums);

  return metricsByResolvedAddress.map((metric) => ({
    ...metric,
    impact:
      metric.latency.value === null
        ? 0
        : ((metric.latency.value - minLatencySum) /
            (maxLatencySum - minLatencySum)) *
          100,
  }));
}
