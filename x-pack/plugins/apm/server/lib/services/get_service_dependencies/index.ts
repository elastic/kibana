/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { joinByKey } from '../../../../common/utils/join_by_key';
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
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
  error_rate: {
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
  const { start, end, apmEventClient } = setup;

  const [allMetrics, destinationMap] = await Promise.all([
    getMetrics({
      start,
      end,
      apmEventClient,
      serviceName,
      environment,
      numBuckets,
    }),
    getDestinationMap({
      apmEventClient,
      serviceName,
      start,
      end,
      environment,
    }),
  ]);

  const metricsWithMappedDestinations = allMetrics.map((metricItem) => {
    const spanDestination = metricItem.key;

    const destination = destinationMap[spanDestination];

    return {
      destination: destination
        ? destination
        : {
            [SPAN_DESTINATION_SERVICE_RESOURCE]: metricItem.key,
          },
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
        error_rate: {
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
          name: destination.service!.name,
          serviceName: destination.service!.name,
          environment: destination.service!.environment,
          agentName: destination.service!.agentName,
          ...destMetrics,
        };
      }

      return {
        name: destination[SPAN_DESTINATION_SERVICE_RESOURCE],
        spanType:
          'span.type' in destination ? destination[SPAN_TYPE] : undefined,
        spanSubtype:
          'span.subtype' in destination ? destination[SPAN_SUBTYPE] : undefined,
        ...destMetrics,
      };
    }
  );

  const latencySums = metricsByResolvedAddress
    .map((metrics) => metrics.latency.value)
    .filter((n) => n !== null) as number[];

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
