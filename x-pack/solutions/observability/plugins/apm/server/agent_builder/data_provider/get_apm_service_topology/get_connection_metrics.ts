/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateThroughputWithRange } from '@kbn/apm-data-access-plugin/server/utils';
import { termQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { getStats } from '../../../lib/connections/get_connection_stats/get_stats';
import { buildConnectionKey } from './build_connections_from_spans';
import type { ConnectionMetrics, ConnectionWithKey, ServiceTopologyConnection } from './types';

interface MetricsMap {
  [key: string]: ConnectionMetrics;
}

export async function getConnectionMetrics({
  apmEventClient,
  start,
  end,
  serviceNames,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceNames: string[];
}): Promise<MetricsMap> {
  if (serviceNames.length === 0) {
    return {};
  }

  const statsItems = await getStats({
    apmEventClient,
    start,
    end,
    filter:
      serviceNames.length > 1
        ? [{ terms: { [SERVICE_NAME]: serviceNames } }]
        : termQuery(SERVICE_NAME, serviceNames[0]),
    numBuckets: 1,
    withTimeseries: false,
  });

  const metricsEntries = statsItems.flatMap((item) => {
    const serviceName = item.from.serviceName;
    const dependencyName = item.to.dependencyName;
    if (!serviceName || !dependencyName) {
      return [];
    }

    const key = buildConnectionKey(serviceName, dependencyName);
    const { error_count, success_count, latency_count, latency_sum } = item.value;
    const totalCount = error_count + success_count;

    return [
      [
        key,
        {
          errorRate: totalCount > 0 ? error_count / totalCount : undefined,
          latencyMs: latency_count > 0 ? latency_sum / latency_count / 1000 : undefined,
          throughputPerMin:
            latency_count > 0
              ? Math.round(
                  calculateThroughputWithRange({ start, end, value: latency_count }) * 1000
                ) / 1000
              : undefined,
        },
      ] as const,
    ];
  });

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
