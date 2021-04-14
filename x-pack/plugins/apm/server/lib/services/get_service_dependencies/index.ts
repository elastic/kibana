/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy, merge } from 'lodash';
import { ValuesType } from 'utility-types';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/elasticsearch_fieldnames';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { maybe } from '../../../../common/utils/maybe';
import { offsetPreviousPeriodCoordinates } from '../../../utils/offset_previous_period_coordinate';
import { withApmSpan } from '../../../utils/with_apm_span';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { findCommonConnections } from './find_common_connections';
import { getConnections } from './get_connections';
import { getDestinationMaps } from './get_destination_map';
import { getMetrics } from './get_metrics';

function calculateMetrics({
  metrics,
  destinationMap,
  start,
  end,
}: {
  metrics: PromiseReturnType<typeof getMetrics>;
  destinationMap: ReturnType<typeof getDestinationMaps>;
  start: number;
  end: number;
}) {
  const metricsWithDestinationIds = metrics.map((metricItem) => {
    const spanDestination = metricItem.span.destination.service.resource;

    const destination = maybe(destinationMap[spanDestination]);
    const id = destination?.id || {
      [SPAN_DESTINATION_SERVICE_RESOURCE]: spanDestination,
    };

    return merge(
      {
        id,
        metrics: [metricItem],
        span: { destination: { service: { resource: spanDestination } } },
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

      return merge({}, itemA, itemB, {
        metrics: metricsA.concat(metricsB),
      });
    }
  );

  const metricsByResolvedAddress = metricsJoinedByDestinationId.map((item) => {
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
        value: { count: 0, latency_sum: 0, error_count: 0 },
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
            ? (mergedMetrics.value.error_count ?? 0) / mergedMetrics.value.count
            : null,
        timeseries: mergedMetrics.timeseries.map((point) => ({
          x: point.x,
          y: point.count > 0 ? (point.error_count ?? 0) / point.count : null,
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
  });

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
}

async function getServiceMetricsAndConnections({
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
}) {
  return await Promise.all([
    getMetrics({
      setup,
      serviceName,
      environment,
      numBuckets,
      start,
      end,
    }),
    getConnections({
      setup,
      serviceName,
      environment,
      start,
      end,
    }),
  ]);
}

export async function getServiceDependenciesPerPeriod({
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
  return withApmSpan('get_service_dependencies', async () => {
    const { start, end } = setup;

    const [
      [currentPeriodMetrics, currentPeriodConnections],
      [previousPeriodMetrics, previousPeriodConnections] = [],
    ] = await Promise.all([
      getServiceMetricsAndConnections({
        setup,
        serviceName,
        environment,
        numBuckets,
        start,
        end,
      }),
      ...(comparisonStart && comparisonEnd
        ? [
            getServiceMetricsAndConnections({
              setup,
              serviceName,
              environment,
              numBuckets,
              start: comparisonStart,
              end: comparisonEnd,
            }),
          ]
        : []),
    ]);

    const commonPreviousConnections = findCommonConnections({
      currentPeriodConnections,
      previousPeriodConnections,
    });

    const currentDestinationMap = getDestinationMaps(currentPeriodConnections);
    const previousDestinationMap = getDestinationMaps(
      commonPreviousConnections
    );

    const currentPeriod = calculateMetrics({
      metrics: currentPeriodMetrics,
      destinationMap: currentDestinationMap,
      start,
      end,
    });

    const currentPeriodMap = keyBy(currentPeriod, 'name');

    const previousPeriod =
      comparisonStart && comparisonEnd && previousPeriodMetrics
        ? calculateMetrics({
            metrics: previousPeriodMetrics,
            destinationMap: previousDestinationMap,
            start: comparisonStart,
            end: comparisonEnd,
          }).map((previousItem) => {
            const currentItem = currentPeriodMap[previousItem.name];
            return {
              ...previousItem,
              latency: {
                ...previousItem.latency,
                timeseries: offsetPreviousPeriodCoordinates({
                  currentPeriodTimeseries: currentItem?.latency.timeseries,
                  previousPeriodTimeseries: previousItem.latency.timeseries,
                }),
              },
              throughput: {
                ...previousItem.throughput,
                timeseries: offsetPreviousPeriodCoordinates({
                  currentPeriodTimeseries: currentItem?.throughput.timeseries,
                  previousPeriodTimeseries: previousItem.throughput.timeseries,
                }),
              },
              errorRate: {
                ...previousItem.errorRate,
                timeseries: offsetPreviousPeriodCoordinates({
                  currentPeriodTimeseries: currentItem?.errorRate.timeseries,
                  previousPeriodTimeseries: previousItem.errorRate.timeseries,
                }),
              },
            };
          })
        : [];

    return {
      currentPeriod,
      previousPeriod: keyBy(previousPeriod, 'name'),
    };
  });
}
