/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  calculateThroughputWithRange,
  getDocumentTypeFilterForServiceDestinationStatistics,
  getRollupIntervalForTimeRange,
} from '@kbn/apm-data-access-plugin/server/utils';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  EVENT_OUTCOME,
} from '../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../common/event_outcome';
import { excludeRumExitSpansQuery } from '../../../lib/connections/exclude_rum_exit_spans_query';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
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

  const response = await apmEventClient.search('get_topology_connection_metrics', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ServiceDestinationMetric,
          rollupInterval: getRollupIntervalForTimeRange(start, end),
        },
      ],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...getDocumentTypeFilterForServiceDestinationStatistics(true),
          ...excludeRumExitSpansQuery(),
          ...termQuery(SERVICE_NAME, serviceNames.length === 1 ? serviceNames[0] : undefined),
          ...(serviceNames.length > 1 ? [{ terms: { [SERVICE_NAME]: serviceNames } }] : []),
        ],
      },
    },
    aggs: {
      connections: {
        composite: {
          size: 1500,
          sources: asMutableArray([
            { serviceName: { terms: { field: SERVICE_NAME } } },
            { dependencyName: { terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE } } },
          ] as const),
        },
        aggs: {
          total_latency_sum: {
            sum: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM },
          },
          total_latency_count: {
            sum: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT },
          },
          error_count: {
            filter: {
              bool: { filter: [{ term: { [EVENT_OUTCOME]: EventOutcome.failure } }] },
            },
          },
          success_count: {
            filter: {
              bool: { filter: [{ term: { [EVENT_OUTCOME]: EventOutcome.success } }] },
            },
          },
        },
      },
    },
  });

  const metricsMap: MetricsMap = {};

  for (const bucket of response.aggregations?.connections.buckets ?? []) {
    const serviceName = bucket.key.serviceName as string;
    const dependencyName = bucket.key.dependencyName as string;
    const key = `${serviceName}::${dependencyName}`;

    const latencyCount = bucket.total_latency_count.value ?? 0;
    const latencySum = bucket.total_latency_sum.value ?? 0;
    const errorCount = bucket.error_count.doc_count ?? 0;
    const successCount = bucket.success_count.doc_count ?? 0;
    const totalOutcomes = errorCount + successCount;

    metricsMap[key] = {
      // Convert from microseconds to milliseconds
      latencyMs: latencyCount > 0 ? latencySum / latencyCount / 1000 : null,
      throughputPerMin:
        latencyCount > 0
          ? Math.round(calculateThroughputWithRange({ start, end, value: latencyCount }) * 1000) /
            1000
          : null,
      errorRate: totalOutcomes > 0 ? errorCount / totalOutcomes : null,
    };
  }

  return metricsMap;
}

export function finalizeConnections(
  connections: ConnectionWithKey[],
  metricsMap?: MetricsMap
): ServiceTopologyConnection[] {
  return connections.map((conn) => ({
    source: conn.source,
    target: conn.target,
    metrics: metricsMap?.[conn._key] ?? null,
  }));
}
