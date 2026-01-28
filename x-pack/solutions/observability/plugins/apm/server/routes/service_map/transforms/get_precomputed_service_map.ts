/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  AGENT_NAME,
  PARENT_ID,
} from '../../../../common/es_fields/apm';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { SERVICE_MAP_EDGES_INDEX, SERVICE_MAP_ENTRY_POINTS_INDEX } from './constants';

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
  hasSpanLinks: boolean;
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

export interface PrecomputedServiceMapTiming {
  total: number;
  fetchPrecomputedData: number;
  buildSpanIdMapping: number;
  resolveDestinations: number;
  buildFinalEdges: number;
  edgesCount: number;
  servicesCount: number;
  resolutionsNeeded: number;
  resolutionsFound: number;
}

/**
 * Fetches service map data using a hybrid approach:
 * 1. Pre-computed edges from transforms (fast)
 * 2. Runtime resolution of destination services (accurate)
 */
export async function getPrecomputedServiceMap({
  esClient,
  apmEventClient,
  start,
  end,
  environment,
  serviceName,
  logger,
}: {
  esClient: ElasticsearchClient;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment?: string;
  serviceName?: string;
  logger?: { debug: (msg: string) => void };
}): Promise<PrecomputedServiceMapResult & { timing?: PrecomputedServiceMapTiming }> {
  const totalStart = performance.now();
  const timing: PrecomputedServiceMapTiming = {
    total: 0,
    fetchPrecomputedData: 0,
    buildSpanIdMapping: 0,
    resolveDestinations: 0,
    buildFinalEdges: 0,
    edgesCount: 0,
    servicesCount: 0,
    resolutionsNeeded: 0,
    resolutionsFound: 0,
  };

  // Step 1: Fetch pre-computed data from transforms
  const step1Start = performance.now();
  const { rawEdges, services } = await fetchPrecomputedData({
    esClient,
    start,
    end,
    environment,
    serviceName,
  });
  timing.fetchPrecomputedData = performance.now() - step1Start;
  timing.edgesCount = rawEdges.length;
  timing.servicesCount = services.size;

  // Step 2: Build span ID → resource mapping for edges that need resolution
  const step2Start = performance.now();
  const spanIdToResource = new Map<string, string>();
  for (const edge of rawEdges) {
    if (edge.destinationResource && edge.sampleSpanId && !services.has(edge.destinationResource)) {
      spanIdToResource.set(edge.sampleSpanId, edge.destinationResource);
    }
  }
  timing.buildSpanIdMapping = performance.now() - step2Start;
  timing.resolutionsNeeded = spanIdToResource.size;

  // Step 3: Resolve destination services using pre-stored span IDs
  const step3Start = performance.now();
  const resourceToService = await resolveDestinationServices({
    apmEventClient,
    spanIdToResource,
    start,
    end,
  });
  timing.resolveDestinations = performance.now() - step3Start;
  timing.resolutionsFound = resourceToService.size;

  // Step 4: Build final edges with resolved destinations
  const step4Start = performance.now();
  const edges: ServiceMapEdge[] = rawEdges.map((edge) => {
    let destinationService: DestinationService | null = null;

    if (edge.destinationResource) {
      const fromCatalog = services.get(edge.destinationResource);
      if (fromCatalog) {
        destinationService = {
          serviceName: fromCatalog.serviceName,
          serviceEnvironment: fromCatalog.environment,
          agentName: fromCatalog.agentName,
        };
      } else {
        destinationService = resourceToService.get(edge.destinationResource) ?? null;
      }
    }

    if (destinationService && !services.has(destinationService.serviceName)) {
      services.set(destinationService.serviceName, {
        serviceName: destinationService.serviceName,
        environment: destinationService.serviceEnvironment,
        agentName: destinationService.agentName,
      });
    }

    return {
      sourceService: edge.sourceService,
      sourceEnvironment: edge.sourceEnvironment,
      sourceAgentName: edge.sourceAgentName,
      destinationResource: edge.destinationResource,
      destinationService,
      spanType: edge.spanType,
      spanSubtype: edge.spanSubtype,
      hasSpanLinks: edge.hasSpanLinks,
    };
  });
  timing.buildFinalEdges = performance.now() - step4Start;

  timing.total = performance.now() - totalStart;

  console.log(
    `[PrecomputedServiceMap] Timing: ${JSON.stringify({
      total: `${timing.total.toFixed(0)}ms`,
      fetchPrecomputedData: `${timing.fetchPrecomputedData.toFixed(0)}ms`,
      buildSpanIdMapping: `${timing.buildSpanIdMapping.toFixed(0)}ms`,
      resolveDestinations: `${timing.resolveDestinations.toFixed(0)}ms`,
      buildFinalEdges: `${timing.buildFinalEdges.toFixed(0)}ms`,
      edgesCount: timing.edgesCount,
      servicesCount: timing.servicesCount,
      resolutionsNeeded: timing.resolutionsNeeded,
      resolutionsFound: timing.resolutionsFound,
    })}`
  );

  return { edges, services, timing };
}

interface RawEdge {
  sourceService: string;
  sourceEnvironment: string | null;
  sourceAgentName: AgentName | null;
  destinationResource: string | null;
  spanType: string | null;
  spanSubtype: string | null;
  hasSpanLinks: boolean;
  // Sample span data for correlation
  sampleSpanId: string | null;
  sampleSpanLinkId: string | null;
}

async function fetchPrecomputedData({
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
}): Promise<{ rawEdges: RawEdge[]; services: Map<string, ServiceInfo> }> {
  const timeFilter = {
    range: { last_seen: { gte: new Date(start).toISOString(), lte: new Date(end).toISOString() } },
  };

  const edgeFilters: object[] = [timeFilter];
  if (environment && environment !== 'ENVIRONMENT_ALL') {
    edgeFilters.push({ term: { source_environment: environment } });
  }
  if (serviceName) {
    edgeFilters.push({
      bool: {
        should: [
          { term: { source_service: serviceName } },
          { term: { destination_resource: serviceName } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const [edgesResponse, catalogResponse] = await Promise.all([
    esClient.search({
      index: SERVICE_MAP_EDGES_INDEX,
      size: 10000,
      query: { bool: { filter: edgeFilters } },
      _source: [
        'source_service',
        'source_agent_name',
        'source_environment',
        'destination_resource',
        'span_type',
        'span_subtype',
        'sample_span',
      ],
    }),
    esClient.search({
      index: SERVICE_MAP_ENTRY_POINTS_INDEX,
      size: 10000,
      query: { bool: { filter: [timeFilter] } },
      _source: ['service_name', 'service_environment'],
    }),
  ]);

  const services = new Map<string, ServiceInfo>();
  for (const hit of catalogResponse.hits.hits) {
    const src = hit._source as { service_name?: string; service_environment?: string };
    if (src.service_name) {
      services.set(src.service_name, {
        serviceName: src.service_name,
        environment: src.service_environment ?? null,
        agentName: null,
      });
    }
  }

  const rawEdges: RawEdge[] = [];
  for (const hit of edgesResponse.hits.hits) {
    const src = hit._source as {
      source_service: string;
      source_agent_name?: string;
      source_environment?: string;
      destination_resource?: string;
      span_type?: string;
      span_subtype?: string;
      sample_span?: {
        'span.id'?: string;
        'span.links.span_id'?: string;
        'otel.span.links.span_id'?: string;
      };
    };

    // Extract data
    const sourceAgentName = (src.source_agent_name as AgentName) ?? null;
    const sampleSpan = src.sample_span;
    const sampleSpanId = sampleSpan?.['span.id'] ?? null;
    const sampleSpanLinkId =
      sampleSpan?.['span.links.span_id'] ?? sampleSpan?.['otel.span.links.span_id'] ?? null;

    // Add/update source service in catalog with agent name
    if (!services.has(src.source_service) || services.get(src.source_service)?.agentName === null) {
      services.set(src.source_service, {
        serviceName: src.source_service,
        environment: src.source_environment ?? null,
        agentName: sourceAgentName,
      });
    }

    rawEdges.push({
      sourceService: src.source_service,
      sourceEnvironment: src.source_environment ?? null,
      sourceAgentName,
      destinationResource: src.destination_resource ?? null,
      spanType: src.span_type ?? null,
      spanSubtype: src.span_subtype ?? null,
      hasSpanLinks: sampleSpanLinkId !== null,
      sampleSpanId,
      sampleSpanLinkId,
    });
  }

  return { rawEdges, services };
}

/**
 * Resolves destination services using pre-stored span IDs from the transform.
 * This is much faster than querying for span IDs at runtime.
 *
 * Uses same pattern as fetchTransactionsFromExitSpans in fetch_exit_span_samples.ts
 */
async function resolveDestinationServices({
  apmEventClient,
  spanIdToResource,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  spanIdToResource: Map<string, string>;
  start: number;
  end: number;
}): Promise<Map<string, DestinationService>> {
  const result = new Map<string, DestinationService>();
  const spanIds = Array.from(spanIdToResource.keys());

  if (spanIds.length === 0) return result;

  // Find transactions where parent.id matches the pre-stored span IDs
  const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, PARENT_ID] as const);
  const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);

  const txResponse = await apmEventClient.search('resolve_destination_transactions', {
    apm: { events: [ProcessorEvent.transaction] },
    track_total_hits: false,
    size: spanIds.length,
    query: { bool: { filter: [...rangeQuery(start, end), ...termsQuery(PARENT_ID, ...spanIds)] } },
    fields: [...requiredFields, ...optionalFields],
  });

  // Map span.id → service, then resource → service
  for (const hit of txResponse.hits.hits) {
    const tx = accessKnownApmEventFields(hit.fields).requireFields(requiredFields);
    const parentId = tx[PARENT_ID];
    const resource = spanIdToResource.get(parentId);

    if (resource) {
      result.set(resource, {
        serviceName: tx[SERVICE_NAME],
        serviceEnvironment: tx[SERVICE_ENVIRONMENT] ?? null,
        agentName: tx[AGENT_NAME],
      });
    }
  }

  return result;
}

/**
 * Checks if the pre-computed service map indexes exist.
 */
export async function isPrecomputedServiceMapAvailable(
  esClient: ElasticsearchClient
): Promise<boolean> {
  try {
    const [edgesExists, entryPointsExists] = await Promise.all([
      esClient.indices.exists({ index: SERVICE_MAP_EDGES_INDEX }),
      esClient.indices.exists({ index: SERVICE_MAP_ENTRY_POINTS_INDEX }),
    ]);
    return edgesExists && entryPointsExists;
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
    .filter((edge) => edge.destinationResource !== null)
    .map((edge, index) => ({
      // Generate synthetic spanId since transforms aggregate away individual spans
      spanId: `precomputed-${index}`,
      serviceName: edge.sourceService,
      agentName: edge.sourceAgentName ?? ('unknown' as AgentName),
      serviceEnvironment: edge.sourceEnvironment ?? undefined,
      spanType: edge.spanType ?? 'unknown',
      spanSubtype: edge.spanSubtype ?? '',
      spanDestinationServiceResource: edge.destinationResource!,
      destinationService: edge.destinationService
        ? {
            serviceName: edge.destinationService.serviceName,
            agentName: edge.destinationService.agentName ?? ('unknown' as AgentName),
            serviceEnvironment: edge.destinationService.serviceEnvironment ?? undefined,
          }
        : undefined,
    }));
}
