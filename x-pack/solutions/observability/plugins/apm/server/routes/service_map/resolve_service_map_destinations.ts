/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_ID,
} from '../../../common/es_fields/apm';

const EDGES_INDEX = '.apm-service-map-workflow';

interface ServiceMapEdge {
  source_service: string;
  source_agent: string;
  source_environment: string;
  destination_resource: string;
  destination_service: string | null;
  destination_agent: string | null;
  destination_environment: string | null;
  span_type: string;
  span_subtype: string;
  span_count: number;
  edge_type: 'exit_span' | 'span_link';
  sample_span_id: string;
  computed_at: string;
}

export interface ResolveServiceMapDestinationsResponse {
  unresolvedExitEdges: number;
  unresolvedLinkEdges: number;
  resolved: number;
}

export async function resolveServiceMapDestinations({
  apmEventClient,
  esClient,
  start,
  end,
  logger,
}: {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  logger: Logger;
}): Promise<ResolveServiceMapDestinationsResponse> {
  const now = new Date().toISOString();

  // Get unresolved exit span edges
  const unresolvedExitEdges = await esClient.search<ServiceMapEdge>({
    size: 10000,
    query: {
      bool: {
        filter: [{ term: { edge_type: 'exit_span' } }, { exists: { field: 'sample_span_id' } }],
        must_not: [{ exists: { field: 'destination_service' } }],
      },
    },
  });

  // Get unresolved span link edges
  const unresolvedLinkEdges = await esClient.search<ServiceMapEdge>({
    index: EDGES_INDEX,
    size: 10000,
    query: {
      bool: {
        filter: [{ term: { edge_type: 'span_link' } }, { exists: { field: 'sample_span_id' } }],
        must_not: [{ exists: { field: 'destination_service' } }],
      },
    },
  });

  const exitEdgeHits = unresolvedExitEdges.hits.hits;
  const linkEdgeHits = unresolvedLinkEdges.hits.hits;

  logger.debug(
    `Found ${exitEdgeHits.length} unresolved exit edges, ${linkEdgeHits.length} unresolved link edges`
  );

  let resolvedCount = 0;
  const bulkOperations: object[] = [];

  // Resolve exit spans by looking up transactions with matching parent.id
  if (exitEdgeHits.length > 0) {
    const spanIds = exitEdgeHits
      .map((hit) => hit._source?.sample_span_id)
      .filter((id): id is string => !!id);

    if (spanIds.length > 0) {
      const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);
      const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, PARENT_ID] as const);

      const txResponse = await apmEventClient.search('resolve_exit_span_destinations', {
        apm: {
          events: [ProcessorEvent.transaction],
        },
        track_total_hits: false,
        size: spanIds.length,
        query: {
          bool: {
            filter: [...rangeQuery(start, end), ...termsQuery(PARENT_ID, ...spanIds)],
          },
        },
        fields: [...requiredFields, ...optionalFields],
      });

      // Build lookup map: parent.id -> destination service info
      const destinationLookup = new Map<
        string,
        { serviceName: string; environment: string; agent: string }
      >();
      for (const hit of txResponse.hits.hits) {
        const fields = hit.fields as Record<string, unknown[]>;
        const parentId = fields?.[PARENT_ID]?.[0] as string | undefined;
        if (parentId) {
          destinationLookup.set(parentId, {
            serviceName: (fields?.[SERVICE_NAME]?.[0] as string) ?? '',
            environment: (fields?.[SERVICE_ENVIRONMENT]?.[0] as string) ?? '',
            agent: (fields?.[AGENT_NAME]?.[0] as string) ?? '',
          });
        }
      }

      // Build bulk update operations
      for (const hit of exitEdgeHits) {
        const spanId = hit._source?.sample_span_id;
        if (!spanId) continue;

        const destination = destinationLookup.get(spanId);
        if (destination) {
          bulkOperations.push(
            { update: { _index: EDGES_INDEX, _id: hit._id } },
            {
              doc: {
                destination_service: destination.serviceName,
                destination_environment: destination.environment,
                destination_agent: destination.agent,
                computed_at: now,
              },
            }
          );
          resolvedCount++;
        }
      }
    }
  }

  // Resolve span links by looking up spans with matching span.id
  if (linkEdgeHits.length > 0) {
    const linkedSpanIds = linkEdgeHits
      .map((hit) => hit._source?.sample_span_id)
      .filter((id): id is string => !!id);

    if (linkedSpanIds.length > 0) {
      const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);
      const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, SPAN_ID] as const);

      const spanResponse = await apmEventClient.search('resolve_span_link_destinations', {
        apm: {
          events: [ProcessorEvent.span],
        },
        track_total_hits: false,
        size: linkedSpanIds.length,
        query: {
          bool: {
            filter: [...rangeQuery(start, end), ...termsQuery(SPAN_ID, ...linkedSpanIds)],
          },
        },
        fields: [...requiredFields, ...optionalFields],
      });

      // Build lookup map: span.id -> destination service info
      const linkDestinationLookup = new Map<
        string,
        { serviceName: string; environment: string; agent: string }
      >();
      for (const hit of spanResponse.hits.hits) {
        const fields = hit.fields as Record<string, unknown[]>;
        const spanId = fields?.[SPAN_ID]?.[0] as string | undefined;
        if (spanId) {
          linkDestinationLookup.set(spanId, {
            serviceName: (fields?.[SERVICE_NAME]?.[0] as string) ?? '',
            environment: (fields?.[SERVICE_ENVIRONMENT]?.[0] as string) ?? '',
            agent: (fields?.[AGENT_NAME]?.[0] as string) ?? '',
          });
        }
      }

      // Build bulk update operations for span links
      for (const hit of linkEdgeHits) {
        const linkedSpanId = hit._source?.sample_span_id;
        if (!linkedSpanId) continue;

        const destination = linkDestinationLookup.get(linkedSpanId);
        if (destination) {
          bulkOperations.push(
            { update: { _index: EDGES_INDEX, _id: hit._id } },
            {
              doc: {
                destination_service: destination.serviceName,
                destination_environment: destination.environment,
                destination_agent: destination.agent,
                computed_at: now,
              },
            }
          );
          resolvedCount++;
        }
      }
    }
  }

  // Execute bulk update
  if (bulkOperations.length > 0) {
    await esClient.bulk({
      refresh: true,
      operations: bulkOperations,
    });
  }

  logger.debug(`Resolved ${resolvedCount} edges`);

  return {
    unresolvedExitEdges: exitEdgeHits.length,
    unresolvedLinkEdges: linkEdgeHits.length,
    resolved: resolvedCount,
  };
}
