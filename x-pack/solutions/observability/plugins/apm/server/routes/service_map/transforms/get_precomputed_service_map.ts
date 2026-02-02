/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { EDGES_INDEX } from '../workflow/core/utils';

interface ServiceInfo {
  serviceName: string;
  environment: string | null;
  agentName: AgentName | null;
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
  sampleSpans?: string[]; // Array of span IDs
}

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
  sample_spans?: string[]; // Array of span IDs
}

interface PrecomputedServiceMapResult {
  edges: ServiceMapEdge[];
  services: Map<string, ServiceInfo>;
}

/**
 * Fetches service map data from the OneWorkflow pre-computed index.
 * Destinations are already resolved by the workflow - no runtime resolution needed.
 * Paginates through all results to handle large service maps.
 *
 * When serviceName is provided, performs graph traversal to include:
 * - Direct edges (service as source or destination)
 * - Transitive upstream dependencies (what calls the service, and what calls those services, etc.)
 * - Transitive downstream dependencies (what the service calls, and what those call, etc.)
 */
export async function getPrecomputedServiceMap({
  esClient,
  start,
  end,
  environment,
  serviceName,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  environment?: string;
  serviceName?: string;
}): Promise<PrecomputedServiceMapResult> {
  // If no specific service requested, return all edges for environment
  if (!serviceName) {
    return fetchAllEdges(esClient, environment);
  }

  // Fetch all edges first (needed for graph traversal)
  const allEdgesResult = await fetchAllEdges(esClient, environment);

  // Build adjacency maps for graph traversal
  const upstreamMap = new Map<string, Set<string>>(); // service -> services that call it
  const downstreamMap = new Map<string, Set<string>>(); // service -> services it calls

  for (const edge of allEdgesResult.edges) {
    const source = edge.sourceService;
    const dest = edge.destinationService?.serviceName;

    if (dest) {
      // Track downstream: source -> dest
      if (!downstreamMap.has(source)) {
        downstreamMap.set(source, new Set());
      }
      downstreamMap.get(source)!.add(dest);

      // Track upstream: dest <- source
      if (!upstreamMap.has(dest)) {
        upstreamMap.set(dest, new Set());
      }
      upstreamMap.get(dest)!.add(source);
    }
  }

  // Traverse to find connected services (limited depth)
  const connectedServices = new Set<string>([serviceName]);

  // Get 1 level upstream (services that directly call this service)
  const directUpstream = upstreamMap.get(serviceName) || new Set<string>();
  for (const caller of directUpstream) {
    connectedServices.add(caller);
  }

  // Get 1 level downstream for each upstream service
  for (const upstreamService of directUpstream) {
    const downstreamOfUpstream = downstreamMap.get(upstreamService) || new Set<string>();
    for (const downstream of downstreamOfUpstream) {
      connectedServices.add(downstream);
    }
  }

  // Get 1 level downstream (services this service directly calls)
  const directDownstream = downstreamMap.get(serviceName) || new Set<string>();
  for (const callee of directDownstream) {
    connectedServices.add(callee);
  }

  // Filter edges to only include those between connected services
  const filteredEdges = allEdgesResult.edges.filter((edge) => {
    const source = edge.sourceService;
    const dest = edge.destinationService?.serviceName;

    // Include edge if source is connected, regardless of destination resolution
    // (unresolved edges might still be relevant to show external dependencies)
    return connectedServices.has(source) || (dest && connectedServices.has(dest));
  });

  // Filter services to only include connected ones
  const filteredServices = new Map<string, ServiceInfo>();
  for (const [name, info] of allEdgesResult.services) {
    if (connectedServices.has(name)) {
      filteredServices.set(name, info);
    }
  }

  return { edges: filteredEdges, services: filteredServices };
}

/**
 * Fetches all edges from the workflow index with optional environment filter.
 * Uses terms aggregation on source_service to handle high cardinality efficiently.
 */
async function fetchAllEdges(
  esClient: ElasticsearchClient,
  environment?: string
): Promise<PrecomputedServiceMapResult> {
  const filters: object[] = [
    { range: { computed_at: { gte: 'now-6h' } } },
    ...(environment && environment !== 'ENVIRONMENT_ALL'
      ? [{ term: { source_environment: environment } }]
      : []),
  ];

  const services = new Map<string, ServiceInfo>();
  const edges: ServiceMapEdge[] = [];

  // Use composite aggregation on source_service + destination_service (both low cardinality)
  // Then sub-aggregate on destination_resource (high cardinality)
  let afterKey: Record<string, any> | undefined;

  do {
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
                size: 100, // Limit per source-destination pair
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
                      'sample_spans',
                    ],
                  },
                },
              },
            },
          },
        },
      },
    });

    const compositeBuckets = (response.aggregations?.service_pairs as any)?.buckets || [];
    if (compositeBuckets.length === 0) break;

    for (const bucket of compositeBuckets) {
      const resourceBuckets = bucket.by_resource?.buckets || [];

      for (const resourceBucket of resourceBuckets) {
        const hit = resourceBucket.latest?.hits?.hits?.[0];
        if (!hit?._source) continue;

        const src = hit._source;
        const sourceAgentName = (src.source_agent as AgentName | undefined) ?? null;
        const destAgentName = (src.destination_agent as AgentName | undefined) ?? null;

        // Track source service
        if (!services.has(src.source_service)) {
          services.set(src.source_service, {
            serviceName: src.source_service,
            environment: src.source_environment ?? null,
            agentName: sourceAgentName,
          });
        }

        // Track destination service if resolved
        if (src.destination_service && !services.has(src.destination_service)) {
          services.set(src.destination_service, {
            serviceName: src.destination_service,
            environment: src.destination_environment ?? null,
            agentName: destAgentName,
          });
        }

        edges.push({
          sourceService: src.source_service,
          sourceEnvironment: src.source_environment ?? null,
          sourceAgentName,
          destinationResource: src.destination_resource ?? null,
          destinationService: src.destination_service
            ? {
                serviceName: src.destination_service,
                environment: src.destination_environment ?? null,
                agentName: destAgentName,
              }
            : null,
          spanType: src.span_type ?? null,
          spanSubtype: src.span_subtype ?? null,
          edgeType: src.edge_type ?? 'exit_span',
          sampleSpans: src.sample_spans,
        });
      }
    }

    const compositeResult = response.aggregations?.service_pairs as any;
    afterKey = compositeResult?.after_key;
  } while (afterKey);

  return { edges, services };
}

export async function isPrecomputedServiceMapAvailable(
  esClient: ElasticsearchClient
): Promise<boolean> {
  try {
    const exists = await esClient.indices.exists({ index: EDGES_INDEX });
    if (!exists) return false;

    const { count } = await esClient.count({
      index: EDGES_INDEX,
      query: { range: { computed_at: { gte: 'now-24h' } } },
    });

    return count > 0;
  } catch {
    return false;
  }
}

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
  // Deduplicate edges by unique key: source + environment + destination
  // This handles cases where the workflow may have stored near-duplicates
  const uniqueEdges = new Map<string, ServiceMapEdge>();

  for (const edge of edges) {
    if (!edge.destinationResource) continue;

    const key = [edge.sourceService, edge.destinationResource].join('::');

    // Keep first occurrence (or could prefer resolved destinations)
    if (
      !uniqueEdges.has(key) ||
      (edge.destinationService && !uniqueEdges.get(key)?.destinationService)
    ) {
      uniqueEdges.set(key, edge);
    }
  }

  return Array.from(uniqueEdges.values()).map((edge) => ({
    spanId: edge.sampleSpans?.[0] || `synthetic-${edge.sourceService}-${edge.destinationResource}`,
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
