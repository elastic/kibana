/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getDestinationMap } from './get_destination_map';
import { getMetrics } from './get_metrics';
import {
  calculateDestinationMetrics,
  getCalculateImpact,
  getMetricsWithDestinationIds,
  joinMetricsByDestinationId,
  calculateMetricValues,
  offsetPreviousMetrics,
} from './helpers';

async function getServiceMetricsAndDestinationMap({
  setup,
  serviceName,
  environment,
  numBuckets,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  environment?: string;
  numBuckets: number;
}) {
  const { start, end } = setup;
  const [metrics, destinationMap] = await Promise.all([
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
    }),
  ]);
  return { metrics, destinationMap };
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

    const currentPeriodPromise = getServiceMetricsAndDestinationMap({
      setup,
      serviceName,
      environment,
      numBuckets,
    });

    const previousPeriodPromise =
      comparisonStart && comparisonEnd
        ? getMetrics({
            setup,
            serviceName,
            environment,
            numBuckets,
            start: comparisonStart,
            end: comparisonEnd,
          })
        : [];

    const [
      currentPeriodMetricsAndDestinationMap,
      previousPeriodMetrics,
    ] = await Promise.all([currentPeriodPromise, previousPeriodPromise]);

    const metricsWithDestinationIds = getMetricsWithDestinationIds({
      destinationMap: currentPeriodMetricsAndDestinationMap.destinationMap,
      currentPeriodMetrics: currentPeriodMetricsAndDestinationMap.metrics,
      previousPeriodMetrics,
    });

    const metricsJoinedByDestinationId = joinMetricsByDestinationId(
      metricsWithDestinationIds
    );

    const metricsByResolvedAddress = metricsJoinedByDestinationId.map(
      (item) => {
        const { metrics, previousMetrics } = item;
        const mergedMetrics = calculateMetricValues(metrics);
        const previousPeriodMergedMetrics = calculateMetricValues(
          previousMetrics
        );

        const currentDestinationMetrics = calculateDestinationMetrics({
          mergedMetrics,
          start,
          end,
        });

        const previousDestinationMetrics =
          comparisonStart && comparisonEnd
            ? calculateDestinationMetrics({
                mergedMetrics: previousPeriodMergedMetrics,
                start: comparisonStart,
                end: comparisonEnd,
              })
            : undefined;

        const offsetPreviousDestinationMetrics = offsetPreviousMetrics({
          currentDestinationMetrics,
          previousDestinationMetrics,
        });

        if (item.service) {
          return {
            name: item.service.name,
            type: 'service' as const,
            serviceName: item.service.name,
            environment: item.service.environment,
            // agent.name should always be there, type returned from joinByKey is too pessimistic
            agentName: item.agent!.name,
            currentPeriodMetrics: currentDestinationMetrics,
            previousPeriodMetrics: offsetPreviousDestinationMetrics,
          };
        }

        return {
          name: item.span.destination.service.resource,
          type: 'external' as const,
          spanType: item.span.type,
          spanSubtype: item.span.subtype,
          currentPeriodMetrics: currentDestinationMetrics,
          previousPeriodMetrics: offsetPreviousDestinationMetrics,
        };
      }
    );

    const calculateCurrentImpact = getCalculateImpact(
      metricsByResolvedAddress
        .map(
          (metric) =>
            (metric.currentPeriodMetrics.latency.value ?? 0) *
            (metric.currentPeriodMetrics.throughput.value ?? 0)
        )
        .filter(isFiniteNumber)
    );

    const calculatePreviousImpact = getCalculateImpact(
      metricsByResolvedAddress
        .map(
          (metric) =>
            (metric.previousPeriodMetrics.latency?.value ?? 0) *
            (metric.previousPeriodMetrics.throughput?.value ?? 0)
        )
        .filter(isFiniteNumber)
    );

    const serviceDependencies = metricsByResolvedAddress.map((metric) => {
      return {
        ...metric,
        currentPeriodMetrics: {
          ...metric.currentPeriodMetrics,
          impact: calculateCurrentImpact({
            latencyValue: metric.currentPeriodMetrics.latency.value,
            throughputValue: metric.currentPeriodMetrics.throughput.value,
          }),
        },
        previousPeriodMetrics: {
          ...metric.previousPeriodMetrics,
          impact: calculatePreviousImpact({
            latencyValue: metric.previousPeriodMetrics.latency?.value ?? 0,
            throughputValue:
              metric.previousPeriodMetrics.throughput?.value ?? 0,
          }),
        },
      };
    });

    return { serviceDependencies };
  });
}
