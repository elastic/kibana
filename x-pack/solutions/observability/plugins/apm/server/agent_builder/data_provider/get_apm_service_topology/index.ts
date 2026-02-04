/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { calculateThroughputWithRange } from '@kbn/apm-data-access-plugin/server/utils';
import { getDocumentTypeFilterForServiceDestinationStatistics } from '@kbn/apm-data-access-plugin/server/utils';
import type { APMConfig } from '../../..';
import { parseDatemath } from '../../utils/time';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { ServiceMapSpan } from '../../../../common/service_map/types';
import { getTraceSampleIds } from '../../../routes/service_map/get_trace_sample_ids';
import { fetchExitSpanSamplesFromTraceIds } from '../../../routes/service_map/fetch_exit_span_samples';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  EVENT_OUTCOME,
} from '../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../common/event_outcome';
import { excludeRumExitSpansQuery } from '../../../lib/connections/exclude_rum_exit_spans_query';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { environmentQuery } from '../../../../common/utils/environment_query';

export type TopologyDirection = 'downstream' | 'upstream' | 'both';

export interface ServiceTopologyNode {
  'service.name': string;
  'agent.name': string;
  'service.environment'?: string;
}

export interface ExternalNode {
  'span.destination.service.resource': string;
  'span.type': string;
  'span.subtype': string;
}

export interface ConnectionMetrics {
  errorRate: number | null;
  latencyMs: number | null;
  throughputPerMin: number | null;
}

export interface ServiceTopologyConnection {
  source: ServiceTopologyNode | ExternalNode;
  target: ServiceTopologyNode | ExternalNode;
  metrics: ConnectionMetrics | null;
}

export interface ServiceTopologyResponse {
  tracesCount: number;
  connections: ServiceTopologyConnection[];
}

interface ConnectionWithKey extends ServiceTopologyConnection {
  _key: string;
  _sourceName: string;
  _dependencyName: string;
}

function buildConnectionsFromSpans(spans: ServiceMapSpan[]): ConnectionWithKey[] {
  const connectionMap = new Map<string, ConnectionWithKey>();

  for (const span of spans) {
    const source: ServiceTopologyNode = {
      'service.name': span.serviceName,
      'agent.name': span.agentName,
      'service.environment': span.serviceEnvironment,
    };

    let target: ServiceTopologyNode | ExternalNode;

    if (span.destinationService) {
      // Target is another service
      target = {
        'service.name': span.destinationService.serviceName,
        'agent.name': span.destinationService.agentName,
        'service.environment': span.destinationService.serviceEnvironment,
      };
    } else {
      // Target is an external dependency
      target = {
        'span.destination.service.resource': span.spanDestinationServiceResource,
        'span.type': span.spanType,
        'span.subtype': span.spanSubtype,
      };
    }

    // Create a unique key for deduplication using source service + dependency resource
    const sourceName = source['service.name'];
    const dependencyName = span.spanDestinationServiceResource;
    const connectionKey = `${sourceName}::${dependencyName}`;

    if (!connectionMap.has(connectionKey)) {
      connectionMap.set(connectionKey, {
        source,
        target,
        metrics: null,
        _key: connectionKey,
        _sourceName: sourceName,
        _dependencyName: dependencyName,
      });
    }
  }

  return Array.from(connectionMap.values());
}

interface MetricsMap {
  [key: string]: ConnectionMetrics;
}

async function getConnectionMetrics({
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
          rollupInterval: RollupInterval.OneMinute,
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

function enrichConnectionsWithMetrics(
  connections: ConnectionWithKey[],
  metricsMap: MetricsMap
): ServiceTopologyConnection[] {
  return connections.map((conn) => {
    const metrics = metricsMap[conn._key] ?? null;
    // Remove internal keys and return clean connection
    return {
      source: conn.source,
      target: conn.target,
      metrics,
    };
  });
}

function stripInternalKeys(connections: ConnectionWithKey[]): ServiceTopologyConnection[] {
  return connections.map((conn) => ({
    source: conn.source,
    target: conn.target,
    metrics: conn.metrics,
  }));
}

/**
 * Get upstream connections - services that call the target service.
 * This queries ServiceDestinationMetric where span.destination.service.resource
 * matches the target service name.
 */
async function getUpstreamConnections({
  apmEventClient,
  serviceName,
  environment,
  kuery,
  start,
  end,
  includeMetrics,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  kuery?: string;
  start: number;
  end: number;
  includeMetrics: boolean;
}): Promise<ServiceTopologyConnection[]> {
  const response = await apmEventClient.search('get_upstream_connections', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ServiceDestinationMetric,
          rollupInterval: RollupInterval.OneMinute,
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
          // Find exit spans where the destination matches the target service
          { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: serviceName } },
          ...environmentQuery(environment),
          ...kqlQuery(kuery),
        ],
      },
    },
    aggs: {
      callers: {
        composite: {
          size: 1500,
          sources: asMutableArray([
            { serviceName: { terms: { field: SERVICE_NAME } } },
            { agentName: { terms: { field: AGENT_NAME } } },
            { serviceEnvironment: { terms: { field: SERVICE_ENVIRONMENT, missing_bucket: true } } },
            { spanType: { terms: { field: SPAN_TYPE, missing_bucket: true } } },
            { spanSubtype: { terms: { field: SPAN_SUBTYPE, missing_bucket: true } } },
          ] as const),
        },
        aggs: includeMetrics
          ? {
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
            }
          : {},
      },
    },
  });

  const connections: ServiceTopologyConnection[] = [];

  interface UpstreamBucket {
    key: {
      serviceName: string;
      agentName: string;
      serviceEnvironment: string | null;
      spanType: string | null;
      spanSubtype: string | null;
    };
    total_latency_sum?: { value: number };
    total_latency_count?: { value: number };
    error_count?: { doc_count: number };
    success_count?: { doc_count: number };
  }

  const buckets = (response.aggregations?.callers as { buckets: UpstreamBucket[] })?.buckets ?? [];

  for (const bucket of buckets) {
    const callerServiceName = bucket.key.serviceName;
    const callerAgentName = bucket.key.agentName;
    const callerEnvironment = bucket.key.serviceEnvironment;
    const spanType = bucket.key.spanType;
    const spanSubtype = bucket.key.spanSubtype;

    // Skip self-references
    if (callerServiceName === serviceName) {
      continue;
    }

    const source: ServiceTopologyNode = {
      'service.name': callerServiceName,
      'agent.name': callerAgentName,
      'service.environment': callerEnvironment ?? undefined,
    };

    // Target is always the service being queried (represented as external node from caller's perspective)
    const target: ExternalNode = {
      'span.destination.service.resource': serviceName,
      'span.type': spanType ?? 'unknown',
      'span.subtype': spanSubtype ?? 'unknown',
    };

    let metrics: ConnectionMetrics | null = null;

    if (includeMetrics && bucket.total_latency_count) {
      const latencyCount = bucket.total_latency_count.value ?? 0;
      const latencySum = bucket.total_latency_sum?.value ?? 0;
      const errorCount = bucket.error_count?.doc_count ?? 0;
      const successCount = bucket.success_count?.doc_count ?? 0;
      const totalOutcomes = errorCount + successCount;

      metrics = {
        latencyMs: latencyCount > 0 ? latencySum / latencyCount / 1000 : null,
        throughputPerMin:
          latencyCount > 0
            ? Math.round(calculateThroughputWithRange({ start, end, value: latencyCount }) * 1000) /
              1000
            : null,
        errorRate: totalOutcomes > 0 ? errorCount / totalOutcomes : null,
      };
    }

    connections.push({ source, target, metrics });
  }

  return connections;
}

async function getDownstreamConnections({
  apmEventClient,
  config,
  logger,
  serviceName,
  environment,
  kuery,
  startMs,
  endMs,
  includeMetrics,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  environment: string;
  kuery?: string;
  startMs: number;
  endMs: number;
  includeMetrics: boolean;
}): Promise<{ tracesCount: number; connections: ServiceTopologyConnection[] }> {
  logger.debug('Getting trace sample IDs for downstream topology');

  const { traceIds } = await getTraceSampleIds({
    config,
    apmEventClient,
    serviceName,
    environment,
    start: startMs,
    end: endMs,
    kuery,
  });

  logger.debug(`Found ${traceIds.length} traces to inspect for downstream topology`);

  if (traceIds.length === 0) {
    return { tracesCount: 0, connections: [] };
  }

  const spans = await fetchExitSpanSamplesFromTraceIds({
    apmEventClient,
    traceIds,
    start: startMs,
    end: endMs,
  });

  const connectionsWithKeys = buildConnectionsFromSpans(spans);

  if (!includeMetrics) {
    return {
      tracesCount: traceIds.length,
      connections: stripInternalKeys(connectionsWithKeys),
    };
  }

  // Get unique service names from connections for metrics query
  const serviceNames = [...new Set(connectionsWithKeys.map((conn) => conn._sourceName))];

  logger.debug(`Fetching metrics for ${serviceNames.length} services`);

  const metricsMap = await getConnectionMetrics({
    apmEventClient,
    start: startMs,
    end: endMs,
    serviceNames,
  });

  const connections = enrichConnectionsWithMetrics(connectionsWithKeys, metricsMap);

  return {
    tracesCount: traceIds.length,
    connections,
  };
}

export async function getApmServiceTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  environment,
  direction = 'downstream',
  kuery,
  start,
  end,
  includeMetrics = true,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  environment?: string;
  direction?: TopologyDirection;
  kuery?: string;
  start: string;
  end: string;
  includeMetrics?: boolean;
}): Promise<ServiceTopologyResponse> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);
  const env = environment ?? ENVIRONMENT_ALL.value;

  let downstreamResult: { tracesCount: number; connections: ServiceTopologyConnection[] } = {
    tracesCount: 0,
    connections: [],
  };
  let upstreamConnections: ServiceTopologyConnection[] = [];

  // Fetch downstream connections if needed
  if (direction === 'downstream' || direction === 'both') {
    downstreamResult = await getDownstreamConnections({
      apmEventClient,
      config,
      logger,
      serviceName,
      environment: env,
      kuery,
      startMs,
      endMs,
      includeMetrics,
    });
  }

  // Fetch upstream connections if needed
  if (direction === 'upstream' || direction === 'both') {
    logger.debug('Fetching upstream connections');
    upstreamConnections = await getUpstreamConnections({
      apmEventClient,
      serviceName,
      environment: env,
      kuery,
      start: startMs,
      end: endMs,
      includeMetrics,
    });
    logger.debug(`Found ${upstreamConnections.length} upstream connections`);
  }

  // Combine connections from both directions
  const allConnections = [...downstreamResult.connections, ...upstreamConnections];

  return {
    tracesCount: downstreamResult.tracesCount,
    connections: allConnections,
  };
}
