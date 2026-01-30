/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';

// OneWorkflow index name
const WORKFLOW_SERVICE_MAP_INDEX = '.apm-service-map-workflow';

interface DestinationService {
  serviceName: string;
  serviceEnvironment: string | null;
  agentName: AgentName | null;
}

interface ServiceMapEdge {
  sourceService: string;
  sourceEnvironment: string | null;
  sourceAgentName: AgentName | null;
  destinationResource: string | null;
  destinationService: DestinationService | null;
  spanType: string | null;
  spanSubtype: string | null;
  edgeType: string;
}

interface ServiceInfo {
  serviceName: string;
  environment: string | null;
  agentName: AgentName | null;
}

interface PrecomputedServiceMapResult {
  edges: ServiceMapEdge[];
  services: Map<string, ServiceInfo>;
}

const PAGE_SIZE = 1000; // Process edges in pages to avoid memory issues

/**
 * Fetches service map data from the OneWorkflow pre-computed index.
 * Destinations are already resolved by the workflow - no runtime resolution needed.
 * Paginates through all results to handle large service maps.
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
  const filters: object[] = [
    // Filter by computed_at within 24h (workflow retention period)
    { range: { computed_at: { gte: 'now-24h' } } },
  ];

  if (environment && environment !== 'ENVIRONMENT_ALL') {
    filters.push({ term: { source_environment: environment } });
  }

  if (serviceName) {
    filters.push({
      bool: {
        should: [
          { term: { source_service: serviceName } },
          { term: { destination_service: serviceName } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const services = new Map<string, ServiceInfo>();
  const edges: ServiceMapEdge[] = [];
  // Use stable sort for pagination (same as in resolve_service_map_destinations.ts)
  let searchAfter: Array<string | number> | undefined;

  // Paginate through all edges
  do {
    const response = await esClient.search({
      index: WORKFLOW_SERVICE_MAP_INDEX,
      size: PAGE_SIZE,
      sort: [
        { computed_at: { order: 'asc' } },
        { source_service: { order: 'asc' } },
        { destination_resource: { order: 'asc' } },
      ],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      query: { bool: { filter: filters } },
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
      ],
    });

    const hits = response.hits.hits;
    if (hits.length === 0) {
      break;
    }

    for (const hit of hits) {
      const src = hit._source as {
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
      };

      const sourceAgentName = (src.source_agent as AgentName) ?? null;
      const destAgentName = (src.destination_agent as AgentName) ?? null;

      // Add source service to catalog
      if (!services.has(src.source_service)) {
        services.set(src.source_service, {
          serviceName: src.source_service,
          environment: src.source_environment ?? null,
          agentName: sourceAgentName,
        });
      }

      // Add destination service to catalog (if resolved)
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
              serviceEnvironment: src.destination_environment ?? null,
              agentName: destAgentName,
            }
          : null,
        spanType: src.span_type ?? null,
        spanSubtype: src.span_subtype ?? null,
        edgeType: src.edge_type ?? 'exit_span',
      });
    }

    // Get search_after from last hit for next page
    if (hits.length > 0 && hits[hits.length - 1].sort) {
      searchAfter = hits[hits.length - 1].sort as Array<string | number>;
    } else {
      break;
    }
  } while (true);

  return { edges, services };
}

/**
 * Checks if the OneWorkflow service map index exists and has data.
 */
export async function isPrecomputedServiceMapAvailable(
  esClient: ElasticsearchClient
): Promise<boolean> {
  try {
    const exists = await esClient.indices.exists({ index: WORKFLOW_SERVICE_MAP_INDEX });
    if (!exists) return false;

    // Check if there's recent data (within 24h retention)
    const countResponse = await esClient.count({
      index: WORKFLOW_SERVICE_MAP_INDEX,
      query: {
        range: { computed_at: { gte: 'now-24h' } },
      },
    });

    return countResponse.count > 0;
  } catch {
    return false;
  }
}

/**
 * Converts pre-computed edges to ServiceMapSpan format for compatibility
 * with existing service map UI code.
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
  return edges
    .filter((edge) => edge.destinationResource != null && edge.destinationResource !== '')
    .map((edge, index) => ({
      // Generate synthetic spanId since workflow aggregates away individual spans
      spanId: `precomputed-${index}`,
      serviceName: edge.sourceService,
      agentName: edge.sourceAgentName ?? ('unknown' as AgentName),
      serviceEnvironment: edge.sourceEnvironment || undefined,
      // Ensure spanType is never empty - groupResourceNodes relies on this
      spanType: edge.spanType || 'external',
      spanSubtype: edge.spanSubtype || '',
      spanDestinationServiceResource: edge.destinationResource!,
      destinationService: edge.destinationService
        ? {
            serviceName: edge.destinationService.serviceName,
            agentName: edge.destinationService.agentName ?? ('unknown' as AgentName),
            serviceEnvironment: edge.destinationService.serviceEnvironment || undefined,
          }
        : undefined,
    }));
}
