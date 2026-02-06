/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  calculateThroughputWithRange,
  getDocumentTypeFilterForServiceDestinationStatistics,
  getRollupIntervalForTimeRange,
} from '@kbn/apm-data-access-plugin/server/utils';
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
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  EVENT_OUTCOME,
} from '../../../../common/es_fields/apm';

import { EventOutcome } from '../../../../common/event_outcome';
import { excludeRumExitSpansQuery } from '../../../lib/connections/exclude_rum_exit_spans_query';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';

export type TopologyDirection = 'downstream' | 'upstream' | 'both';

export interface ServiceTopologyNode {
  'service.name': string;
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
    };

    let target: ServiceTopologyNode | ExternalNode;

    if (span.destinationService) {
      // Target is another service
      target = {
        'service.name': span.destinationService.serviceName,
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

function finalizeConnections(
  connections: ConnectionWithKey[],
  metricsMap?: MetricsMap
): ServiceTopologyConnection[] {
  return connections.map((conn) => ({
    source: conn.source,
    target: conn.target,
    metrics: metricsMap?.[conn._key] ?? null,
  }));
}

/**
 * Filters connections to only include those that are downstream (descendants) of the root service.
 * This performs a graph traversal starting from the root service, following outgoing edges.
 *
 * For example, given connections: A→B, B→C, A→D, X→Y
 * filterDownstreamConnections(connections, 'A') returns: A→B, B→C, A→D
 * (excludes X→Y because X is not reachable from A)
 *
 * This excludes sibling dependencies - services called by ancestors but not by the queried service
 * or its descendants.
 */
function filterDownstreamConnections(
  connections: ConnectionWithKey[],
  rootServiceName: string
): ConnectionWithKey[] {
  // Build adjacency list: source -> list of connections from that source
  const adjacencyMap = new Map<string, ConnectionWithKey[]>();
  for (const conn of connections) {
    const existing = adjacencyMap.get(conn._sourceName) ?? [];
    existing.push(conn);
    adjacencyMap.set(conn._sourceName, existing);
  }

  // BFS traversal starting from rootServiceName
  const visitedServices = new Set<string>();
  const reachableConnections: ConnectionWithKey[] = [];
  const queue: string[] = [rootServiceName];

  while (queue.length > 0) {
    const currentService = queue.shift()!;

    if (visitedServices.has(currentService)) {
      continue;
    }
    visitedServices.add(currentService);

    // Get all connections from this service
    const outgoingConnections = adjacencyMap.get(currentService) ?? [];

    for (const conn of outgoingConnections) {
      reachableConnections.push(conn);

      // If target is a service (not external dependency), add to queue for further traversal
      const target = conn.target;
      if ('service.name' in target) {
        const targetServiceName = target['service.name'];
        if (!visitedServices.has(targetServiceName)) {
          queue.push(targetServiceName);
        }
      }
    }
  }

  return reachableConnections;
}

/**
 * Filters connections to only include those that are upstream (ancestors) of the root service.
 * This performs a reverse graph traversal starting from the root service, following incoming edges.
 *
 * For example, given connections: A→B, B→C, C→D, X→Y
 * filterUpstreamConnections(connections, 'D') returns: A→B, B→C, C→D
 * (excludes X→Y because it doesn't lead to D)
 *
 * This excludes sibling dependencies - services that don't eventually call the queried service.
 *
 * IMPORTANT: Graph traversal relies on resolved `target['service.name']` for service-to-service
 * edges. We do NOT use heuristic matching on `span.destination.service.resource` because that
 * field can contain arbitrary values (proxy hostnames, IP addresses, load balancer names, etc.)
 * that don't necessarily relate to the downstream service name. For the root node only, we also
 * check exact `_dependencyName` match to handle external dependencies (e.g., "postgres").
 */
function filterUpstreamConnections(
  connections: ConnectionWithKey[],
  rootServiceName: string
): ConnectionWithKey[] {
  // Build reverse adjacency lists:
  // 1. By resolved service name (target['service.name']) - reliable for graph traversal
  // 2. By exact dependency name (span.destination.service.resource) - only for root node lookup
  const reverseAdjacencyByService = new Map<string, ConnectionWithKey[]>();
  const reverseAdjacencyByDep = new Map<string, ConnectionWithKey[]>();

  for (const conn of connections) {
    // Add to service name map if the target is a resolved service
    if ('service.name' in conn.target) {
      const targetServiceName = conn.target['service.name'];
      const existing = reverseAdjacencyByService.get(targetServiceName) ?? [];
      existing.push(conn);
      reverseAdjacencyByService.set(targetServiceName, existing);
    }

    // Add to dependency name map (exact key)
    const depName = conn._dependencyName;
    const existingByDep = reverseAdjacencyByDep.get(depName) ?? [];
    existingByDep.push(conn);
    reverseAdjacencyByDep.set(depName, existingByDep);
  }

  // BFS traversal starting from the root service, going backwards through callers
  const visitedServices = new Set<string>();
  const visitedEdges = new Set<string>();
  const reachableConnections: ConnectionWithKey[] = [];
  const queue: string[] = [rootServiceName];

  while (queue.length > 0) {
    const currentService = queue.shift()!;

    if (visitedServices.has(currentService)) {
      continue;
    }
    visitedServices.add(currentService);

    // Find connections where target['service.name'] matches (resolved service-to-service edges)
    const connsByService = reverseAdjacencyByService.get(currentService) ?? [];

    // For the root node only, also find connections by exact dependency name.
    // This handles external dependencies like "postgres" where the user queries by the
    // resource name and there is no resolved target['service.name'].
    const connsByDep =
      currentService === rootServiceName ? reverseAdjacencyByDep.get(currentService) ?? [] : [];

    // Process both sets of connections, deduplicating by edge key
    for (const conn of [...connsByService, ...connsByDep]) {
      if (!visitedEdges.has(conn._key)) {
        visitedEdges.add(conn._key);
        reachableConnections.push(conn);

        const sourceName = conn._sourceName;
        if (!visitedServices.has(sourceName)) {
          queue.push(sourceName);
        }
      }
    }
  }

  return reachableConnections;
}

/**
 * Shared pipeline: fetch exit spans from trace IDs, build connections, filter by direction,
 * and enrich with service_destination metrics.
 */
async function buildTopologyFromTraceIds({
  apmEventClient,
  traceIds,
  serviceName,
  startMs,
  endMs,
  filterFn,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  serviceName: string;
  startMs: number;
  endMs: number;
  filterFn: (connections: ConnectionWithKey[], rootService: string) => ConnectionWithKey[];
}): Promise<ServiceTopologyResponse> {
  if (traceIds.length === 0) {
    return { tracesCount: 0, connections: [] };
  }

  const spans = await fetchExitSpanSamplesFromTraceIds({
    apmEventClient,
    traceIds,
    start: startMs,
    end: endMs,
  });

  const filtered = filterFn(buildConnectionsFromSpans(spans), serviceName);

  const serviceNames = [...new Set(filtered.map((c) => c._sourceName))];
  const metricsMap = await getConnectionMetrics({
    apmEventClient,
    start: startMs,
    end: endMs,
    serviceNames,
  });

  return { tracesCount: traceIds.length, connections: finalizeConnections(filtered, metricsMap) };
}

/**
 * Get trace IDs from exit spans that target a specific external dependency.
 * Used as a fallback for upstream topology when the target has no transactions
 * (e.g., databases like "postgres", caches like "redis").
 *
 * Searches by exact `span.destination.service.resource` match only — no heuristic/fuzzy matching.
 */
async function getTraceIdsFromExitSpansTargetingDependency({
  apmEventClient,
  dependencyName,
  start,
  end,
  maxTraces = 500,
}: {
  apmEventClient: APMEventClient;
  dependencyName: string;
  start: number;
  end: number;
  maxTraces?: number;
}): Promise<string[]> {
  const response = await apmEventClient.search(
    'get_trace_ids_from_exit_spans_targeting_dependency',
    {
      apm: {
        sources: [
          {
            documentType: ApmDocumentType.SpanEvent,
            rollupInterval: RollupInterval.None,
          },
        ],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName } },
          ],
        },
      },
      aggs: {
        sample: {
          sampler: {
            shard_size: maxTraces,
          },
          aggs: {
            traceIds: {
              terms: {
                field: 'trace.id',
                size: maxTraces,
              },
            },
          },
        },
      },
    }
  );

  const buckets =
    (response.aggregations as { sample?: { traceIds?: { buckets?: Array<{ key: string }> } } })
      ?.sample?.traceIds?.buckets ?? [];

  return buckets.map((bucket) => bucket.key);
}

async function getDownstreamTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  startMs,
  endMs,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  startMs: number;
  endMs: number;
}): Promise<ServiceTopologyResponse> {
  const { traceIds } = await getTraceSampleIds({
    config,
    apmEventClient,
    serviceName,
    environment: ENVIRONMENT_ALL.value,
    start: startMs,
    end: endMs,
  });

  logger.debug(`Found ${traceIds.length} traces for downstream topology`);

  return buildTopologyFromTraceIds({
    apmEventClient,
    traceIds,
    serviceName,
    startMs,
    endMs,
    filterFn: filterDownstreamConnections,
  });
}

async function getUpstreamTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  startMs,
  endMs,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  startMs: number;
  endMs: number;
}): Promise<ServiceTopologyResponse> {
  // Strategy: First try to find traces via the service's own transactions.
  // If the service has transactions (it's an instrumented service like "checkout-service"),
  // those traces will contain the full call chain including upstream callers.
  // This is reliable — no field matching needed.
  const { traceIds } = await getTraceSampleIds({
    config,
    apmEventClient,
    serviceName,
    environment: ENVIRONMENT_ALL.value,
    start: startMs,
    end: endMs,
  });

  if (traceIds.length > 0) {
    logger.debug(`Found ${traceIds.length} traces for upstream topology via service transactions`);

    return buildTopologyFromTraceIds({
      apmEventClient,
      traceIds,
      serviceName,
      startMs,
      endMs,
      filterFn: filterUpstreamConnections,
    });
  }

  // Fallback: the service has no transactions, so it's an external dependency (e.g., "postgres").
  // Find traces by exact match on span.destination.service.resource.
  logger.debug(
    `No transactions found for "${serviceName}", falling back to exit span search (external dependency)`
  );

  const depTraceIds = await getTraceIdsFromExitSpansTargetingDependency({
    apmEventClient,
    dependencyName: serviceName,
    start: startMs,
    end: endMs,
  });

  logger.debug(`Found ${depTraceIds.length} traces for upstream topology via exit spans`);

  return buildTopologyFromTraceIds({
    apmEventClient,
    traceIds: depTraceIds,
    serviceName,
    startMs,
    endMs,
    filterFn: filterUpstreamConnections,
  });
}

/**
 * Optimized path for direction === 'both': fetches trace samples and exit spans once,
 * then filters in both directions from the shared connection graph.
 *
 * This avoids duplicate ES queries — getTraceSampleIds and fetchExitSpanSamplesFromTraceIds
 * would otherwise execute identical queries for both downstream and upstream.
 */
async function getBothTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  startMs,
  endMs,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  startMs: number;
  endMs: number;
}): Promise<ServiceTopologyResponse> {
  const { traceIds } = await getTraceSampleIds({
    config,
    apmEventClient,
    serviceName,
    environment: ENVIRONMENT_ALL.value,
    start: startMs,
    end: endMs,
  });

  // External dependency (no transactions): downstream is empty, only upstream applies.
  // Fall back to finding traces via exit spans targeting this dependency.
  if (traceIds.length === 0) {
    logger.debug(
      `No transactions found for "${serviceName}", falling back to exit span search (external dependency)`
    );

    const depTraceIds = await getTraceIdsFromExitSpansTargetingDependency({
      apmEventClient,
      dependencyName: serviceName,
      start: startMs,
      end: endMs,
    });

    logger.debug(`Found ${depTraceIds.length} traces for upstream topology via exit spans`);

    return buildTopologyFromTraceIds({
      apmEventClient,
      traceIds: depTraceIds,
      serviceName,
      startMs,
      endMs,
      filterFn: filterUpstreamConnections,
    });
  }

  logger.debug(`Found ${traceIds.length} traces for both-direction topology`);

  // Fetch exit spans once, build connection graph once
  const spans = await fetchExitSpanSamplesFromTraceIds({
    apmEventClient,
    traceIds,
    start: startMs,
    end: endMs,
  });

  const allConnections = buildConnectionsFromSpans(spans);
  const downFiltered = filterDownstreamConnections(allConnections, serviceName);
  const upFiltered = filterUpstreamConnections(allConnections, serviceName);

  // Single metrics query with union of service names from both directions
  const serviceNames = [
    ...new Set([
      ...downFiltered.map((c) => c._sourceName),
      ...upFiltered.map((c) => c._sourceName),
    ]),
  ];

  const metricsMap = await getConnectionMetrics({
    apmEventClient,
    start: startMs,
    end: endMs,
    serviceNames,
  });

  return {
    tracesCount: traceIds.length,
    connections: [
      ...finalizeConnections(downFiltered, metricsMap),
      ...finalizeConnections(upFiltered, metricsMap),
    ],
  };
}

export async function getApmServiceTopology({
  apmEventClient,
  config,
  logger,
  serviceName,
  direction = 'downstream',
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
  serviceName: string;
  direction?: TopologyDirection;
  start: string;
  end: string;
}): Promise<ServiceTopologyResponse> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);

  const params = { apmEventClient, config, logger, serviceName, startMs, endMs };

  if (direction === 'downstream') {
    return getDownstreamTopology(params);
  }

  if (direction === 'upstream') {
    return getUpstreamTopology(params);
  }

  return getBothTopology(params);
}
