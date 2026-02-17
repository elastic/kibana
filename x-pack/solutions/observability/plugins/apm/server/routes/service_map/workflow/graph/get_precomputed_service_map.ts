/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AgentName } from '../../../../../typings/es_schemas/ui/fields/agent';
import { GRAPH_INDEX } from './utils';
import type { DependencyGraphDocument, GraphData } from './types';

interface ServiceInfo {
  serviceName: string;
  environment: string | null;
  agentName: AgentName | null;
  stale?: boolean;
}

interface ServiceMapEdge {
  sourceService: string;
  sourceEnvironment: string | null;
  sourceAgentName: AgentName | null;
  destinationResource: string | null;
  destinationService: ServiceInfo | null;
  spanType: string | null;
  spanSubtype: string | null;
  edgeType: string;
}

interface PrecomputedServiceMapResult {
  edges: ServiceMapEdge[];
  services: Map<string, ServiceInfo>;
}

/**
 * Fetches the materialized dependency graph from `.apm-dependency-graph`.
 *
 * One document is stored per environment. The read path uses `_search` with
 * an optional term filter on `environment`:
 *   - Specific environment: term filter returns 1 doc
 *   - All environments (ENVIRONMENT_ALL or undefined): match_all returns all docs
 *
 * Subgraph modes:
 *   - serviceName only: 1-hop neighborhood (direct upstream/downstream)
 *   - serviceName + targetServiceName: BFS shortest path(s) between the two
 *   - neither: full graph
 */
export async function getPrecomputedServiceMap({
  esClient,
  environment,
  serviceName,
  targetServiceName,
  logger,
}: {
  esClient: ElasticsearchClient;
  environment?: string;
  serviceName?: string;
  targetServiceName?: string;
  logger: Logger;
}): Promise<PrecomputedServiceMapResult> {
  const graphData = await fetchGraphData({ esClient, environment, logger });

  if (!graphData || (graphData.nodes.length === 0 && graphData.connections.length === 0)) {
    return { edges: [], services: new Map() };
  }

  logger.debug(
    `Loaded materialized graph (${graphData.nodes.length} nodes, ${graphData.connections.length} connections)`
  );

  let filtered: GraphData;
  if (serviceName && targetServiceName) {
    filtered = findPathBetweenServices(graphData, serviceName, targetServiceName);
  } else if (serviceName) {
    filtered = extractFocusedSubgraph(graphData, serviceName);
  } else {
    filtered = graphData;
  }

  return convertGraphDataToResult(filtered);
}

/**
 * Fetches graph data from ES. Uses `collapse` on `environment` with
 * `sort: computed_at desc` to retrieve the latest snapshot per environment.
 *
 * For a specific environment, a term filter narrows to one doc.
 * For all environments, collapse returns the latest snapshot per environment
 * and their graph_data are merged.
 */
async function fetchGraphData({
  esClient,
  environment,
  logger,
}: {
  esClient: ElasticsearchClient;
  environment?: string;
  logger?: Logger;
}): Promise<GraphData | null> {
  const isSpecificEnv = environment && environment !== 'ENVIRONMENT_ALL';

  const query = isSpecificEnv
    ? { term: { environment } }
    : { match_all: {} as Record<string, never> };

  try {
    const response = await esClient.search<DependencyGraphDocument>({
      index: GRAPH_INDEX,
      size: isSpecificEnv ? 1 : 100,
      query,
      sort: [{ computed_at: { order: 'desc' as const } }],
      collapse: { field: 'environment' },
      _source: ['graph_data'],
    });

    const hits = response.hits.hits;
    if (hits.length === 0) {
      logger?.warn(
        `No materialized graph found${isSpecificEnv ? ` for environment ${environment}` : ''}`
      );
      return null;
    }

    if (hits.length === 1) {
      return hits[0]._source?.graph_data ?? null;
    }

    // Multiple docs (all-environments view): merge graph_data
    const allNodes: GraphData['nodes'] = [];
    const allConnections: GraphData['connections'] = [];

    for (const hit of hits) {
      const data = hit._source?.graph_data;
      if (data) {
        allNodes.push(...data.nodes);
        allConnections.push(...data.connections);
      }
    }

    return { nodes: allNodes, connections: allConnections };
  } catch (e: unknown) {
    logger?.warn(`Failed to fetch materialized graph: ${String(e)}`);
    return null;
  }
}

/**
 * Checks whether a materialized dependency graph is available.
 */
export async function isPrecomputedServiceMapAvailable(
  esClient: ElasticsearchClient
): Promise<boolean> {
  try {
    const exists = await esClient.indices.exists({ index: GRAPH_INDEX });
    if (!exists) return false;

    const { count } = await esClient.count({
      index: GRAPH_INDEX,
      query: { range: { computed_at: { gte: 'now-24h' } } },
    });

    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Converts edges from the materialized graph format into ServiceMapSpan format
 * expected by the UI.
 */
export function convertEdgesToServiceMapSpans(edges: ServiceMapEdge[]): Array<{
  spanId: string;
  serviceName: string;
  agentName: AgentName;
  serviceEnvironment?: string;
  spanType: string;
  spanSubtype: string;
  spanDestinationServiceResource: string;
  destinationService?: {
    serviceName: string;
    agentName: AgentName;
    serviceEnvironment?: string;
  };
}> {
  const uniqueEdges = new Map<string, ServiceMapEdge>();

  for (const edge of edges) {
    if (!edge.destinationResource) continue;

    const key = [edge.sourceService, edge.destinationResource].join('::');

    if (
      !uniqueEdges.has(key) ||
      (edge.destinationService && !uniqueEdges.get(key)?.destinationService)
    ) {
      uniqueEdges.set(key, edge);
    }
  }

  return Array.from(uniqueEdges.values()).map((edge) => ({
    spanId: `synthetic-${edge.sourceService}-${edge.destinationResource}`,
    serviceName: edge.sourceService,
    agentName: edge.sourceAgentName ?? ('unknown' as AgentName),
    serviceEnvironment: edge.sourceEnvironment || undefined,
    spanType: edge.spanType || 'external',
    spanSubtype: edge.spanSubtype || '',
    spanDestinationServiceResource: edge.destinationResource!,
    destinationService: edge.destinationService
      ? {
          serviceName: edge.destinationService.serviceName,
          agentName: edge.destinationService.agentName ?? ('unknown' as AgentName),
          serviceEnvironment: edge.destinationService.environment || undefined,
        }
      : undefined,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory graph traversal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds all shortest paths between two services using BFS on an undirected view
 * of the graph. Returns all nodes and edges along those paths.
 *
 * The graph is treated as undirected for path-finding (A->B means both A and B
 * are reachable from each other), but the returned connections preserve their
 * original direction. This ensures that if a path A->B->C->D exists, requesting
 * the path from A to D returns the full chain regardless of edge direction.
 *
 * If no path exists, falls back to the union of both services' 1-hop neighborhoods.
 */
function findPathBetweenServices(
  graph: GraphData,
  fromService: string,
  toService: string
): GraphData {
  // Build undirected adjacency list
  const adjacency = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };
  for (const conn of graph.connections) {
    addEdge(conn.source, conn.target);
  }

  // BFS from fromService, tracking all shortest-path predecessors
  const distance = new Map<string, number>();
  const predecessors = new Map<string, Set<string>>();
  const queue: string[] = [fromService];
  distance.set(fromService, 0);
  predecessors.set(fromService, new Set());

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distance.get(current)!;

    // Stop expanding beyond target distance (optimization)
    if (current === toService) continue;

    const neighbors = adjacency.get(current);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      const neighborDist = distance.get(neighbor);
      if (neighborDist === undefined) {
        // First visit
        distance.set(neighbor, currentDist + 1);
        predecessors.set(neighbor, new Set([current]));
        queue.push(neighbor);
      } else if (neighborDist === currentDist + 1) {
        // Another shortest path to this neighbor
        predecessors.get(neighbor)!.add(current);
      }
    }
  }

  // If target is unreachable, fall back to union of both 1-hop neighborhoods
  if (!distance.has(toService)) {
    const fromGraph = extractFocusedSubgraph(graph, fromService);
    const toGraph = extractFocusedSubgraph(graph, toService);
    const nodeIds = new Set([
      ...fromGraph.nodes.map((n) => n.id),
      ...toGraph.nodes.map((n) => n.id),
    ]);
    const connKeys = new Set<string>();
    const connections = [...fromGraph.connections, ...toGraph.connections].filter((c) => {
      const key = `${c.source}::${c.target}`;
      if (connKeys.has(key)) return false;
      connKeys.add(key);
      return true;
    });
    return {
      nodes: graph.nodes.filter((n) => nodeIds.has(n.id)),
      connections,
    };
  }

  // Walk backwards from toService to collect all nodes on shortest paths
  const pathNodes = new Set<string>();
  const backtrackQueue: string[] = [toService];
  pathNodes.add(toService);

  while (backtrackQueue.length > 0) {
    const current = backtrackQueue.shift()!;
    const preds = predecessors.get(current);
    if (!preds) continue;
    for (const pred of preds) {
      if (!pathNodes.has(pred)) {
        pathNodes.add(pred);
        backtrackQueue.push(pred);
      }
    }
  }

  // Include all connections where at least one end is a path node,
  // so externals and direct neighbors of path services are visible
  const allConnections = graph.connections.filter(
    (c) => pathNodes.has(c.source) || pathNodes.has(c.target)
  );

  // Collect all nodes referenced by the final connections
  const finalNodes = new Set<string>();
  for (const conn of allConnections) {
    finalNodes.add(conn.source);
    finalNodes.add(conn.target);
  }

  return {
    nodes: graph.nodes.filter((n) => finalNodes.has(n.id)),
    connections: allConnections,
  };
}

/**
 * Extracts the 1-hop neighborhood of a service from the graph.
 * Fast in-memory operation on a graph of typically hundreds of nodes.
 */
function extractFocusedSubgraph(graph: GraphData, serviceName: string): GraphData {
  const connectedNodes = new Set<string>([serviceName]);

  // Direct upstream and downstream
  for (const conn of graph.connections) {
    if (conn.source === serviceName) {
      connectedNodes.add(conn.target);
    }
    if (conn.target === serviceName) {
      connectedNodes.add(conn.source);
    }
  }

  // Also include downstream of upstream services (so upstream callers
  // show their other downstream connections too)
  const upstreamServices = new Set<string>();
  for (const conn of graph.connections) {
    if (conn.target === serviceName) {
      upstreamServices.add(conn.source);
    }
  }
  for (const conn of graph.connections) {
    if (upstreamServices.has(conn.source)) {
      connectedNodes.add(conn.target);
    }
  }

  // Filter connections where either end is in the connected set
  const filteredConnections = graph.connections.filter(
    (c) => connectedNodes.has(c.source) || connectedNodes.has(c.target)
  );

  // Collect ALL node IDs referenced by filtered connections so that
  // every connection target/source has a corresponding node entry
  const referencedNodes = new Set<string>();
  for (const conn of filteredConnections) {
    referencedNodes.add(conn.source);
    referencedNodes.add(conn.target);
  }

  return {
    nodes: graph.nodes.filter((n) => referencedNodes.has(n.id)),
    connections: filteredConnections,
  };
}

/** Stale threshold: nodes not seen in 5 minutes are considered stale */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Determines whether a node is stale based on its `last_seen_at` timestamp.
 */
function isNodeStale(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() > STALE_THRESHOLD_MS;
}

/**
 * Converts the materialized graph data format into PrecomputedServiceMapResult.
 * Computes the `stale` flag for each node based on its `last_seen_at` freshness.
 */
function convertGraphDataToResult(graph: GraphData): PrecomputedServiceMapResult {
  const services = new Map<string, ServiceInfo>();
  const edges: ServiceMapEdge[] = [];

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  for (const node of graph.nodes) {
    if (node.type === 'service') {
      services.set(node.id, {
        serviceName: node.id,
        environment: node.environment,
        agentName: (node.agent_name as AgentName | null) ?? null,
        stale: isNodeStale(node.last_seen_at),
      });
    }
  }

  for (const conn of graph.connections) {
    const sourceNode = nodeMap.get(conn.source);
    const targetNode = nodeMap.get(conn.target);

    const destinationResource =
      targetNode?.type === 'external' ? conn.target.substring(1) : conn.target;

    const destinationService =
      targetNode?.type === 'service'
        ? {
            serviceName: targetNode.id,
            environment: targetNode.environment,
            agentName: (targetNode.agent_name as AgentName | null) ?? null,
          }
        : null;

    edges.push({
      sourceService: conn.source,
      sourceEnvironment: sourceNode?.environment ?? null,
      sourceAgentName: (sourceNode?.agent_name as AgentName | null) ?? null,
      destinationResource,
      destinationService,
      spanType: conn.span_type,
      spanSubtype: conn.span_subtype,
      edgeType: conn.edge_type,
    });
  }

  return { edges, services };
}
