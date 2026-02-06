/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { getApmDownstreamDependencies } from '../get_apm_downstream_dependencies';
import { buildConnectionKey } from './build_connections_from_spans';
import type { ConnectionMetrics, ConnectionWithKey, ServiceTopologyConnection } from './types';

interface MetricsMap {
  [key: string]: ConnectionMetrics;
}

export async function getConnectionMetrics({
  apmEventClient,
  randomSampler,
  start,
  end,
  serviceNames,
}: {
  apmEventClient: APMEventClient;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  serviceNames: string[];
}): Promise<MetricsMap> {
  if (serviceNames.length === 0) {
    return {};
  }

  const metricsEntries = (
    await Promise.all(
      serviceNames.map(async (serviceName) => {
        const dependencies = await getApmDownstreamDependencies({
          apmEventClient,
          randomSampler,
          start,
          end,
          filter: [...termQuery(SERVICE_NAME, serviceName)],
        });

        return dependencies.map((dependency) => {
          const dependencyName = dependency['span.destination.service.resource'];
          const key = buildConnectionKey(serviceName, dependencyName);

          return [
            key,
            {
              errorRate: dependency.errorRate,
              latencyMs: dependency.latencyMs,
              throughputPerMin: dependency.throughputPerMin,
            },
          ] as const;
        });
      })
    )
  ).flat();

  return Object.fromEntries(metricsEntries);
}

export function finalizeConnections(
  connections: ConnectionWithKey[],
  metricsMap?: MetricsMap
): ServiceTopologyConnection[] {
  return connections.map((conn) => ({
    source: conn.source,
    target: conn.target,
    metrics: metricsMap?.[conn._key],
  }));
}
