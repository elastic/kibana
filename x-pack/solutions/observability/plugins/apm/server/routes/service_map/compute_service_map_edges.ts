/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { existsQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { EventOutcome } from '../../../common/event_outcome';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  EVENT_OUTCOME,
  AT_TIMESTAMP,
  SPAN_NAME,
  SPAN_LINKS_SPAN_ID,
  OTEL_SPAN_LINKS_SPAN_ID,
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

const SPAN_LINK_IDS_LIMIT = 128;
const MAX_EXIT_SPANS = 5000;
const MAX_SPAN_LINKS = 1000;

function escapeDocId(str: string): string {
  return str.replace(/[ .:/]/g, '_');
}

function buildDocId(prefix: string, sourceService: string, destinationResource: string): string {
  return `${prefix}-${escapeDocId(sourceService)}-${escapeDocId(destinationResource)}`;
}

async function aggregateExitSpanEdges({
  apmEventClient,
  start,
  end,
  logger,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  logger: Logger;
}) {
  const now = new Date().toISOString();

  const response = await apmEventClient.search('get_service_map_workflow_exit_spans', {
    apm: {
      events: [ProcessorEvent.span],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...existsQuery(SPAN_DESTINATION_SERVICE_RESOURCE)],
      },
    },
    aggs: {
      edges: {
        composite: {
          size: MAX_EXIT_SPANS,
          sources: asMutableArray([
            { source_service: { terms: { field: SERVICE_NAME } } },
            { destination_resource: { terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE } } },
          ] as const),
        },
        aggs: {
          span_count: { value_count: { field: SPAN_ID } },
          eventOutcomeGroup: {
            filters: {
              filters: {
                success: { term: { [EVENT_OUTCOME]: EventOutcome.success } },
                others: { bool: { must_not: { term: { [EVENT_OUTCOME]: EventOutcome.success } } } },
              },
            },
            aggs: {
              sample: {
                top_metrics: {
                  size: 1,
                  sort: { [AT_TIMESTAMP]: 'desc' as const },
                  metrics: asMutableArray([
                    { field: SPAN_ID },
                    { field: SPAN_TYPE },
                    { field: SPAN_SUBTYPE },
                    { field: SERVICE_NAME },
                    { field: SERVICE_ENVIRONMENT },
                    { field: AGENT_NAME },
                  ] as const),
                },
              },
            },
          },
        },
      },
    },
  });

  const edges: ServiceMapEdge[] = [];
  const buckets = response.aggregations?.edges.buckets ?? [];

  for (const bucket of buckets) {
    const { success, others } = bucket.eventOutcomeGroup.buckets;
    const eventOutcomeGroup =
      success.sample.top.length > 0 ? success : others.sample.top.length > 0 ? others : undefined;

    const sample = eventOutcomeGroup?.sample.top[0]?.metrics;
    if (!sample) continue;

    const sampleSpanId = sample[SPAN_ID] as string | undefined;
    if (!sampleSpanId) continue;

    edges.push({
      source_service: bucket.key.source_service as string,
      source_agent: (sample[AGENT_NAME] as string) ?? '',
      source_environment: (sample[SERVICE_ENVIRONMENT] as string) ?? '',
      destination_resource: bucket.key.destination_resource as string,
      destination_service: null,
      destination_agent: null,
      destination_environment: null,
      span_type: (sample[SPAN_TYPE] as string) ?? 'external',
      span_subtype: (sample[SPAN_SUBTYPE] as string) ?? '',
      span_count: bucket.span_count.value ?? 0,
      edge_type: 'exit_span',
      sample_span_id: sampleSpanId,
      computed_at: now,
    });
  }

  logger.debug(`Aggregated ${edges.length} exit span edges`);
  return edges;
}

async function aggregateSpanLinkEdges({
  apmEventClient,
  start,
  end,
  logger,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  logger: Logger;
}) {
  const now = new Date().toISOString();

  const response = await apmEventClient.search('get_service_map_workflow_span_links', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          {
            bool: {
              minimum_should_match: 1,
              should: [...existsQuery(SPAN_LINKS_SPAN_ID), ...existsQuery(OTEL_SPAN_LINKS_SPAN_ID)],
            },
          },
        ],
      },
    },
    aggs: {
      span_links: {
        composite: {
          size: MAX_SPAN_LINKS,
          sources: asMutableArray([
            { source_service: { terms: { field: SERVICE_NAME } } },
            { span_name: { terms: { field: SPAN_NAME } } },
          ] as const),
        },
        aggs: {
          span_count: { value_count: { field: SPAN_ID } },
          linked_span_ids: { terms: { field: SPAN_LINKS_SPAN_ID, size: SPAN_LINK_IDS_LIMIT } },
          otel_linked_span_ids: {
            terms: { field: OTEL_SPAN_LINKS_SPAN_ID, size: SPAN_LINK_IDS_LIMIT },
          },
          sample: {
            top_metrics: {
              size: 1,
              sort: { [AT_TIMESTAMP]: 'desc' as const },
              metrics: asMutableArray([
                { field: SPAN_TYPE },
                { field: SPAN_SUBTYPE },
                { field: SERVICE_NAME },
                { field: SERVICE_ENVIRONMENT },
                { field: AGENT_NAME },
              ] as const),
            },
          },
        },
      },
    },
  });

  const edges: ServiceMapEdge[] = [];
  const buckets = response.aggregations?.span_links.buckets ?? [];

  for (const bucket of buckets) {
    const linkedSpanId =
      (bucket.linked_span_ids.buckets[0]?.key as string) ??
      (bucket.otel_linked_span_ids.buckets[0]?.key as string);

    if (!linkedSpanId) continue;

    const sample = bucket.sample?.top[0]?.metrics;

    edges.push({
      source_service: bucket.key.source_service as string,
      source_agent: (sample?.[AGENT_NAME] as string) ?? '',
      source_environment: (sample?.[SERVICE_ENVIRONMENT] as string) ?? '',
      destination_resource: bucket.key.span_name as string,
      destination_service: null,
      destination_agent: null,
      destination_environment: null,
      span_type: (sample?.[SPAN_TYPE] as string) ?? 'messaging',
      span_subtype: (sample?.[SPAN_SUBTYPE] as string) ?? '',
      span_count: bucket.span_count.value ?? 0,
      edge_type: 'span_link',
      sample_span_id: linkedSpanId,
      computed_at: now,
    });
  }

  logger.debug(`Aggregated ${edges.length} span link edges`);
  return edges;
}

async function indexEdges({
  esClient,
  edges,
  logger,
}: {
  esClient: ElasticsearchClient;
  edges: ServiceMapEdge[];
  logger: Logger;
}) {
  if (edges.length === 0) {
    logger.debug('No edges to index');
    return { indexed: 0, updated: 0, created: 0, skipped: 0 };
  }

  // Build doc IDs for all edges we want to index
  const docIds = edges.map((edge) =>
    buildDocId(
      edge.edge_type === 'exit_span' ? 'exit' : 'link',
      edge.source_service,
      edge.destination_resource
    )
  );

  // Query existing edges to check their resolution status
  const existingEdgesResponse = await esClient.search<ServiceMapEdge>({
    index: EDGES_INDEX,
    size: docIds.length,
    _source: ['destination_service'],
    query: {
      ids: { values: docIds },
    },
  });

  // Build map of doc ID -> has resolved destination
  const existingEdgesMap = new Map<string, boolean>();
  for (const hit of existingEdgesResponse.hits.hits) {
    if (hit._id) {
      const hasResolvedDestination =
        hit._source?.destination_service != null && hit._source.destination_service !== '';
      existingEdgesMap.set(hit._id, hasResolvedDestination);
    }
  }

  // Separate edges into three categories:
  // 1. Resolved edges: skip (don't update if new iteration would set destination_service to null)
  // 2. Unresolved existing edges: update (including destination if we found one)
  // 3. New edges: upsert
  const resolvedEdges: ServiceMapEdge[] = [];
  const unresolvedExistingEdges: ServiceMapEdge[] = [];
  const newEdges: ServiceMapEdge[] = [];

  for (const edge of edges) {
    const docId = buildDocId(
      edge.edge_type === 'exit_span' ? 'exit' : 'link',
      edge.source_service,
      edge.destination_resource
    );

    const isResolved = existingEdgesMap.get(docId) === true;
    const exists = existingEdgesMap.has(docId);

    if (isResolved) {
      // Resolved edges: skip if new iteration would set destination_service to null
      // (which it always does in compute step, so we skip them)
      resolvedEdges.push(edge);
    } else if (exists) {
      // Unresolved existing edges: update (including destination if we found one)
      unresolvedExistingEdges.push(edge);
    } else {
      // New edges: upsert
      newEdges.push(edge);
    }
  }

  const skipped = resolvedEdges.length;

  // Build operations for unresolved existing edges and new edges
  const operations: object[] = [];

  // Unresolved existing edges: update with all fields
  // Only update destination fields if we found a destination service (not null)
  for (const edge of unresolvedExistingEdges) {
    const docId = buildDocId(
      edge.edge_type === 'exit_span' ? 'exit' : 'link',
      edge.source_service,
      edge.destination_resource
    );

    // Build update doc: always update non-destination fields
    // Only include destination fields if we found a destination (not null)
    const updateDoc: Partial<ServiceMapEdge> = {
      source_service: edge.source_service,
      source_agent: edge.source_agent,
      source_environment: edge.source_environment,
      destination_resource: edge.destination_resource,
      span_type: edge.span_type,
      span_subtype: edge.span_subtype,
      span_count: edge.span_count,
      edge_type: edge.edge_type,
      sample_span_id: edge.sample_span_id,
      computed_at: edge.computed_at,
    };

    // Only update destination fields if we found a destination service
    if (edge.destination_service != null) {
      updateDoc.destination_service = edge.destination_service;
      updateDoc.destination_agent = edge.destination_agent;
      updateDoc.destination_environment = edge.destination_environment;
    }
    // Otherwise, destination fields are not included in doc, so they remain unchanged

    operations.push(
      {
        update: {
          _index: EDGES_INDEX,
          _id: docId,
        },
      },
      {
        doc: updateDoc,
      }
    );
  }

  // New edges: upsert with all fields
  // doc is required even when using upsert (doc is used if document exists, upsert if it doesn't)
  for (const edge of newEdges) {
    const docId = buildDocId(
      edge.edge_type === 'exit_span' ? 'exit' : 'link',
      edge.source_service,
      edge.destination_resource
    );
    operations.push(
      {
        update: {
          _index: EDGES_INDEX,
          _id: docId,
        },
      },
      {
        doc: edge,
        upsert: edge,
      }
    );
  }

  if (operations.length === 0) {
    logger.debug(`Skipped all ${skipped} edges (already resolved)`);
    return { indexed: 0, updated: 0, created: 0, skipped };
  }

  const response = await esClient.bulk({
    refresh: true,
    operations,
  });

  const indexed = response.items.filter(
    (item) => item.update?.status === 201 || item.update?.status === 200
  ).length;
  const updated = response.items.filter((item) => item.update?.status === 200).length;
  const created = indexed - updated;

  logger.debug(
    `Processed ${edges.length} edges: ${created} created (new), ${updated} updated (unresolved existing), ${skipped} skipped (resolved)`
  );

  return { indexed, updated, created, skipped };
}

export interface ComputeServiceMapEdgesResponse {
  exitSpanEdges: number;
  spanLinkEdges: number;
  indexed: number;
  updated: number;
  created: number;
  skipped: number;
}

export async function computeServiceMapEdges({
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
}): Promise<ComputeServiceMapEdgesResponse> {
  const [exitSpanEdges, spanLinkEdges] = await Promise.all([
    aggregateExitSpanEdges({ apmEventClient, start, end, logger }),
    aggregateSpanLinkEdges({ apmEventClient, start, end, logger }),
  ]);

  const allEdges = [...exitSpanEdges, ...spanLinkEdges];
  const { indexed, updated, created, skipped } = await indexEdges({
    esClient,
    edges: allEdges,
    logger,
  });

  return {
    exitSpanEdges: exitSpanEdges.length,
    spanLinkEdges: spanLinkEdges.length,
    indexed,
    updated,
    created,
    skipped,
  };
}
