/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Graph materialization -- reads pre-computed edges from the service map
 * workflow edges index and constructs a self-contained graph document
 * (nodes + connections) that can be served directly to the UI.
 *
 * Graph documents are stored as time-series snapshots in `.apm-dependency-graph`.
 * Each workflow run creates a new document (auto-generated ID) so historical
 * snapshots are preserved. Retention cleanup removes snapshots older than 24h.
 * Environment filtering on read is done by ES (term query on `environment`).
 * Service-focused views are derived at query time via in-memory traversal.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EDGES_INDEX, SERVICES_INDEX } from '../core/utils';
import { GRAPH_INDEX, buildExternalNodeId } from './utils';
import type {
  DependencyGraphDocument,
  GraphNode,
  GraphConnection,
  MaterializeGraphResponse,
} from './types';

interface WorkflowEdgeSource {
  source_service: string;
  source_agent?: string;
  source_environment?: string;
  destination_resource?: string;
  destination_service?: string;
  destination_environment?: string;
  destination_agent?: string;
  span_type?: string;
  span_subtype?: string;
  edge_type?: string;
  last_seen_at?: string;
}

interface WorkflowServiceSource {
  service_name: string;
  last_seen_at?: string;
}

/**
 * Materializes the dependency graph for a given environment.
 *
 * Reads edges from `.apm-service-map-workflow-edges` for the given environment,
 * extracts unique nodes and connections, then stores the graph as a new
 * time-series snapshot in `.apm-dependency-graph` (auto-generated doc ID).
 */
export async function materializeGraph({
  esClient,
  environment: rawEnvironment,
  logger,
}: {
  esClient: ElasticsearchClient;
  environment?: string;
  logger: Logger;
}): Promise<MaterializeGraphResponse> {
  const startTime = Date.now();

  // Normalize: treat empty string as undefined (no environment)
  const environment = rawEnvironment || undefined;
  const envLabel = environment ?? '<no environment>';

  logger.info(`Materializing dependency graph for environment: ${envLabel}`);

  await ensureGraphIndex({ esClient, logger });

  const serviceLastSeen = await fetchServiceLastSeen({ esClient, environment, logger });
  const { nodes, connections } = await fetchEdgesAndBuildGraph({
    esClient,
    environment,
    logger,
    serviceLastSeen,
  });

  const nodeCount = nodes.length;
  const connectionCount = connections.length;

  if (nodeCount === 0) {
    logger.info(`No nodes found for environment ${envLabel}, skipping materialization`);
    return { environment: environment ?? '', nodeCount: 0, connectionCount: 0 };
  }

  const now = new Date().toISOString();

  const doc: DependencyGraphDocument = {
    environment: environment ?? '',
    computed_at: now,
    node_count: nodeCount,
    connection_count: connectionCount,
    graph_data: { nodes, connections },
  };

  try {
    await esClient.index({
      index: GRAPH_INDEX,
      document: doc,
      refresh: 'wait_for',
    });
  } catch (e: unknown) {
    logger.error(`Failed to store graph document for ${envLabel}: ${String(e)}`);
    throw e;
  }

  const duration = Date.now() - startTime;
  logger.info(
    `Materialized dependency graph for ${envLabel}: ${nodeCount} nodes, ${connectionCount} connections in ${duration}ms`
  );

  return { environment: environment ?? '', nodeCount, connectionCount };
}

const GRAPH_INDEX_MAPPINGS = {
  properties: {
    environment: { type: 'keyword' as const },
    computed_at: { type: 'date' as const },
    node_count: { type: 'integer' as const },
    connection_count: { type: 'integer' as const },
    graph_data: { type: 'object' as const, enabled: false },
  },
};

/**
 * Ensures the `.apm-dependency-graph` index exists with the correct mapping.
 *
 * The critical detail is `graph_data: { enabled: false }` -- without this,
 * ES tries to dynamically map every nested field which can cause the field
 * to be dropped from `_source`.
 *
 * If the index already exists but `graph_data` doesn't have `enabled: false`,
 * the index is deleted and recreated with the correct mapping.
 */
async function ensureGraphIndex({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  const exists = await esClient.indices.exists({ index: GRAPH_INDEX });

  if (exists) {
    const mapping = await esClient.indices.getMapping({ index: GRAPH_INDEX });
    const indexMapping = Object.values(mapping)[0];
    const graphDataMapping = indexMapping?.mappings?.properties?.graph_data as
      | Record<string, unknown>
      | undefined;

    if (graphDataMapping?.enabled === false) {
      return;
    }

    logger.warn(
      `Index ${GRAPH_INDEX} exists but graph_data mapping is incorrect. Recreating index.`
    );
    await esClient.indices.delete({ index: GRAPH_INDEX });
  }

  try {
    await esClient.indices.create({
      index: GRAPH_INDEX,
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: GRAPH_INDEX_MAPPINGS,
    });
    logger.info(`Created index ${GRAPH_INDEX}`);
  } catch (e: unknown) {
    const esError = e as { meta?: { body?: { error?: { type?: string } } } };
    if (esError?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
      throw e;
    }
  }
}

/**
 * Fetches edges for a given environment and builds the graph.
 *
 * Uses composite aggregation on (source_service, destination_service)
 * with a sub-aggregation on destination_resource to handle high cardinality
 * efficiently.
 */
async function fetchEdgesAndBuildGraph({
  esClient,
  environment,
  logger,
  serviceLastSeen,
}: {
  esClient: ElasticsearchClient;
  environment?: string;
  logger: Logger;
  serviceLastSeen: Map<string, string>;
}): Promise<{ nodes: GraphNode[]; connections: GraphConnection[] }> {
  const nodesMap = new Map<string, GraphNode>();
  const connectionsMap = new Map<string, GraphConnection>();
  const nodeLastSeen = new Map<string, string>();

  const updateNodeLastSeen = (nodeId: string, lastSeen: string | undefined) => {
    if (!lastSeen) return;
    const existing = nodeLastSeen.get(nodeId);
    if (!existing || lastSeen > existing) {
      nodeLastSeen.set(nodeId, lastSeen);
    }
  };

  const environmentFilter = environment
    ? { term: { source_environment: environment } }
    : { bool: { must_not: { exists: { field: 'source_environment' } } } };

  const filters: object[] = [{ range: { computed_at: { gte: 'now-6h' } } }, environmentFilter];

  let afterKey: Record<string, string | number> | undefined;
  let pageCount = 0;

  do {
    pageCount++;

    const response = await esClient.search<WorkflowEdgeSource>({
      index: EDGES_INDEX,
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        service_pairs: {
          composite: {
            size: 10000,
            ...(afterKey ? { after: afterKey } : {}),
            sources: [
              { source_service: { terms: { field: 'source_service' } } },
              {
                destination_service: {
                  terms: { field: 'destination_service', missing_bucket: true },
                },
              },
            ],
          },
          aggs: {
            by_resource: {
              terms: {
                field: 'destination_resource',
                size: 100,
              },
              aggs: {
                latest: {
                  top_hits: {
                    size: 1,
                    sort: [{ computed_at: { order: 'desc' } }],
                    _source: [
                      'source_service',
                      'source_agent',
                      'source_environment',
                      'destination_resource',
                      'destination_service',
                      'destination_environment',
                      'destination_agent',
                      'span_type',
                      'span_subtype',
                      'edge_type',
                      'last_seen_at',
                    ],
                  },
                },
              },
            },
          },
        },
      },
    });

    interface ResourceBucket {
      latest?: { hits?: { hits?: Array<{ _source?: WorkflowEdgeSource }> } };
    }
    interface CompositeBucket {
      by_resource?: { buckets: ResourceBucket[] };
    }
    interface CompositeAgg {
      buckets: CompositeBucket[];
      after_key?: Record<string, string | number>;
    }

    const compositeAgg = response.aggregations?.service_pairs as CompositeAgg | undefined;
    const compositeBuckets = compositeAgg?.buckets ?? [];
    if (compositeBuckets.length === 0) break;

    for (const bucket of compositeBuckets) {
      const resourceBuckets = bucket.by_resource?.buckets ?? [];

      for (const resourceBucket of resourceBuckets) {
        const hit = resourceBucket.latest?.hits?.hits?.[0];
        if (!hit?._source) continue;

        const src = hit._source as WorkflowEdgeSource;

        if (!src.source_service) continue;

        // Track edge-level freshness for both source and destination nodes
        updateNodeLastSeen(src.source_service, src.last_seen_at);

        if (!nodesMap.has(src.source_service)) {
          nodesMap.set(src.source_service, {
            id: src.source_service,
            type: 'service',
            agent_name: src.source_agent ?? null,
            environment: src.source_environment ?? null,
            span_type: null,
            span_subtype: null,
            last_seen_at: null,
          });
        }

        const edgeType =
          (src.edge_type as 'exit_span' | 'span_link' | 'span_link_incoming') ?? 'exit_span';
        const spanType = src.span_type ?? null;
        const spanSubtype = src.span_subtype ?? null;

        if (src.destination_service) {
          updateNodeLastSeen(src.destination_service, src.last_seen_at);

          if (!nodesMap.has(src.destination_service)) {
            nodesMap.set(src.destination_service, {
              id: src.destination_service,
              type: 'service',
              agent_name: src.destination_agent ?? null,
              environment: src.destination_environment ?? null,
              span_type: null,
              span_subtype: null,
              last_seen_at: null,
            });
          }

          const connectionKey = `${src.source_service}::${src.destination_service}::${edgeType}`;
          if (!connectionsMap.has(connectionKey)) {
            connectionsMap.set(connectionKey, {
              source: src.source_service,
              target: src.destination_service,
              edge_type: edgeType,
              span_type: spanType,
              span_subtype: spanSubtype,
            });
          }
        } else if (src.destination_resource) {
          const externalNodeId = buildExternalNodeId(src.destination_resource);

          updateNodeLastSeen(externalNodeId, src.last_seen_at);

          if (!nodesMap.has(externalNodeId)) {
            nodesMap.set(externalNodeId, {
              id: externalNodeId,
              type: 'external',
              agent_name: null,
              environment: null,
              span_type: spanType,
              span_subtype: spanSubtype,
              last_seen_at: null,
            });
          }

          const connectionKey = `${src.source_service}::${externalNodeId}::${edgeType}`;
          if (!connectionsMap.has(connectionKey)) {
            connectionsMap.set(connectionKey, {
              source: src.source_service,
              target: externalNodeId,
              edge_type: edgeType,
              span_type: spanType,
              span_subtype: spanSubtype,
            });
          }
        }
      }
    }

    afterKey = compositeAgg?.after_key;
  } while (afterKey);

  logger.debug(
    `Fetched edges in ${pageCount} pages: ${nodesMap.size} nodes, ${connectionsMap.size} connections`
  );

  // Merge edge freshness with service heartbeat freshness (take the most recent)
  const nodes = Array.from(nodesMap.values()).map((node) => {
    const edgeLastSeen = nodeLastSeen.get(node.id) ?? null;
    const heartbeatLastSeen = serviceLastSeen.get(node.id) ?? null;

    let bestLastSeen: string | null = null;
    if (edgeLastSeen && heartbeatLastSeen) {
      bestLastSeen = edgeLastSeen > heartbeatLastSeen ? edgeLastSeen : heartbeatLastSeen;
    } else {
      bestLastSeen = edgeLastSeen ?? heartbeatLastSeen;
    }

    return { ...node, last_seen_at: bestLastSeen };
  });

  return {
    nodes,
    connections: Array.from(connectionsMap.values()),
  };
}

/**
 * Fetches the latest `last_seen_at` for each service from the services index.
 * Returns a Map from service name to its most recent heartbeat timestamp.
 */
async function fetchServiceLastSeen({
  esClient,
  environment,
  logger,
}: {
  esClient: ElasticsearchClient;
  environment?: string;
  logger: Logger;
}): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  const environmentFilter = environment
    ? { term: { service_environment: environment } }
    : { bool: { must_not: { exists: { field: 'service_environment' } } } };

  try {
    const response = await esClient.search<WorkflowServiceSource>({
      index: SERVICES_INDEX,
      size: 10000,
      query: {
        bool: {
          filter: [environmentFilter],
        },
      },
      _source: ['service_name', 'last_seen_at'],
    });

    for (const hit of response.hits.hits) {
      const src = hit._source;
      if (src?.service_name && src.last_seen_at) {
        const existing = result.get(src.service_name);
        if (!existing || src.last_seen_at > existing) {
          result.set(src.service_name, src.last_seen_at);
        }
      }
    }

    logger.debug(`Fetched service heartbeats for ${result.size} services`);
  } catch {
    logger.warn('Failed to fetch service heartbeats, proceeding without service-level freshness');
  }

  return result;
}
