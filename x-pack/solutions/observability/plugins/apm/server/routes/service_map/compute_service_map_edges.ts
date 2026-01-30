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
const METADATA_DOC_ID = '_workflow-metadata';

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
  sample_span_id: string; // Keep for backward compatibility
  sample_span_ids?: string[]; // Multiple samples for better resolution
  computed_at: string;
}

// Number of spans to sample per edge for better resolution success rate
const SAMPLES_PER_EDGE = 5;

const SPAN_LINK_IDS_LIMIT = 128;
const MAX_EXIT_SPANS = 2000; // Reduced from 5000 to process smaller chunks and yield more frequently
const MAX_SPAN_LINKS = 500; // Reduced from 1000 to process smaller chunks and yield more frequently
const BULK_BATCH_SIZE = 5000; // Process bulk operations in batches
const YIELD_EVERY_N_ITEMS = 50; // Reduced from 100 to yield more frequently and reduce blocking

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
  const edges: ServiceMapEdge[] = [];
  let after: Record<string, string | number> | undefined;

  // Paginate through composite aggregation
  let pageCount = 0;
  do {
    // Yield to event loop between pagination pages
    if (pageCount > 0) {
      await new Promise(setImmediate);
    }
    pageCount++;

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
            ...(after ? { after } : {}),
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
                  others: {
                    bool: { must_not: { term: { [EVENT_OUTCOME]: EventOutcome.success } } },
                  },
                },
              },
              aggs: {
                sample: {
                  top_metrics: {
                    size: SAMPLES_PER_EDGE,
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

    const buckets = response.aggregations?.edges.buckets ?? [];

    // Process buckets in chunks and yield to event loop periodically
    for (let i = 0; i < buckets.length; i++) {
      if (i > 0 && i % YIELD_EVERY_N_ITEMS === 0) {
        await new Promise(setImmediate);
      }

      const bucket = buckets[i];
      const { success, others } = bucket.eventOutcomeGroup.buckets;
      const eventOutcomeGroup =
        success.sample.top.length > 0 ? success : others.sample.top.length > 0 ? others : undefined;

      if (!eventOutcomeGroup || eventOutcomeGroup.sample.top.length === 0) continue;

      // Extract multiple sample span IDs for better resolution success
      const sampleSpanIds = eventOutcomeGroup.sample.top
        .map((top) => top.metrics?.[SPAN_ID] as string | undefined)
        .filter((id): id is string => !!id);

      if (sampleSpanIds.length === 0) continue;

      // Use first sample for backward compatibility
      const firstSample = eventOutcomeGroup.sample.top[0]?.metrics;
      if (!firstSample) continue;

      edges.push({
        source_service: bucket.key.source_service as string,
        source_agent: (firstSample[AGENT_NAME] as string) ?? '',
        source_environment: (firstSample[SERVICE_ENVIRONMENT] as string) ?? '',
        destination_resource: bucket.key.destination_resource as string,
        destination_service: null,
        destination_agent: null,
        destination_environment: null,
        span_type: (firstSample[SPAN_TYPE] as string) ?? 'external',
        span_subtype: (firstSample[SPAN_SUBTYPE] as string) ?? '',
        span_count: bucket.span_count.value ?? 0,
        edge_type: 'exit_span',
        sample_span_id: sampleSpanIds[0], // Keep for backward compatibility
        sample_span_ids: sampleSpanIds, // Multiple samples for better resolution
        computed_at: now,
      });
    }

    // Check if there are more pages
    after = response.aggregations?.edges.after_key;
  } while (after);

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
  const edges: ServiceMapEdge[] = [];
  let after: Record<string, string | number> | undefined;

  // Paginate through composite aggregation
  let pageCount = 0;
  do {
    // Yield to event loop between pagination pages
    if (pageCount > 0) {
      await new Promise(setImmediate);
    }
    pageCount++;

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
                should: [
                  ...existsQuery(SPAN_LINKS_SPAN_ID),
                  ...existsQuery(OTEL_SPAN_LINKS_SPAN_ID),
                ],
              },
            },
          ],
        },
      },
      aggs: {
        span_links: {
          composite: {
            size: MAX_SPAN_LINKS,
            ...(after ? { after } : {}),
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

    const buckets = response.aggregations?.span_links.buckets ?? [];

    // Process buckets in chunks and yield to event loop periodically
    for (let i = 0; i < buckets.length; i++) {
      if (i > 0 && i % YIELD_EVERY_N_ITEMS === 0) {
        await new Promise(setImmediate);
      }

      const bucket = buckets[i];
      // Collect multiple linked span IDs from both APM and OTel fields
      const apmLinkedIds = bucket.linked_span_ids.buckets.map((b) => b.key as string);
      const otelLinkedIds = bucket.otel_linked_span_ids.buckets.map((b) => b.key as string);
      const allLinkedIds = [...new Set([...apmLinkedIds, ...otelLinkedIds])].slice(
        0,
        SAMPLES_PER_EDGE
      );

      if (allLinkedIds.length === 0) continue;

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
        sample_span_id: allLinkedIds[0], // Keep for backward compatibility
        sample_span_ids: allLinkedIds, // Multiple samples for better resolution
        computed_at: now,
      });
    }

    // Check if there are more pages
    after = response.aggregations?.span_links.after_key;
  } while (after);

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

  // OPTIMIZATION: Use msearch to combine resolved edge query + unresolved edge queries in single round trip
  const resolvedEdgeIds = new Set<string>();
  const existingEdgesMap = new Map<string, { isResolved: boolean; currentSampleIds: string[] }>();

  if (docIds.length > 0) {
    // Build msearch requests:
    // 1. Search for resolved edges (to filter them out early)
    // 2. Search for unresolved edges in chunks (to get their sample IDs)
    // Format: [header1, body1, header2, body2, ...]
    const searches: Array<Record<string, unknown>> = [];

    // First search: Find all resolved edges
    searches.push(
      { index: EDGES_INDEX }, // Header with index
      {
        size: docIds.length,
        _source: false, // We only need the _id
        query: {
          bool: {
            filter: [{ ids: { values: docIds } }, { exists: { field: 'destination_service' } }],
          },
        },
      }
    );

    // Additional searches: Get unresolved edges in chunks
    // Process in chunks to avoid URL length limits
    const chunkSize = 1000;
    const chunks: string[][] = [];
    for (let i = 0; i < docIds.length; i += chunkSize) {
      chunks.push(docIds.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      searches.push(
        { index: EDGES_INDEX }, // Header with index
        {
          size: chunk.length,
          _source: ['destination_service', 'sample_span_id', 'sample_span_ids'],
          query: {
            ids: { values: chunk },
          },
        }
      );
    }

    // Execute all searches in a single msearch call
    const msearchResponse = await esClient.msearch({
      searches,
    });

    // Process first response: resolved edges
    if (msearchResponse.responses[0] && 'hits' in msearchResponse.responses[0]) {
      const resolvedResponse = msearchResponse.responses[0];
      for (const hit of resolvedResponse.hits.hits) {
        if (hit._id) {
          resolvedEdgeIds.add(hit._id);
        }
      }
    }

    logger.debug(
      `Found ${resolvedEdgeIds.size} already-resolved edges out of ${docIds.length} total`
    );

    // Process remaining responses: unresolved edges
    for (let i = 1; i < msearchResponse.responses.length; i++) {
      const response = msearchResponse.responses[i];
      if (!response || !('hits' in response)) continue;

      for (let j = 0; j < response.hits.hits.length; j++) {
        if (j > 0 && j % YIELD_EVERY_N_ITEMS === 0) {
          await new Promise(setImmediate);
        }

        const hit = response.hits.hits[j];
        if (!hit._id || resolvedEdgeIds.has(hit._id)) {
          // Skip resolved edges (already processed)
          continue;
        }

        const source = hit._source as ServiceMapEdge | undefined;
        if (source) {
          const hasResolvedDestination =
            source?.destination_service != null && source.destination_service !== '';
          const currentSampleIds: string[] = [];
          if (source?.sample_span_id) {
            currentSampleIds.push(source.sample_span_id);
          }
          if (source?.sample_span_ids && Array.isArray(source.sample_span_ids)) {
            currentSampleIds.push(...source.sample_span_ids.filter((id: string) => !!id));
          }
          // Deduplicate
          const uniqueSampleIds = Array.from(new Set(currentSampleIds));
          existingEdgesMap.set(hit._id, {
            isResolved: hasResolvedDestination,
            currentSampleIds: uniqueSampleIds,
          });
        }
      }
    }

    // Mark resolved edges in the map for fast lookup
    for (const resolvedId of resolvedEdgeIds) {
      existingEdgesMap.set(resolvedId, {
        isResolved: true,
        currentSampleIds: [],
      });
    }
  }
  // Separate edges into three categories:
  // 1. Resolved edges: skip (don't update if new iteration would set destination_service to null)
  // 2. Unresolved existing edges: update (including destination if we found one)
  // 3. New edges: upsert
  const resolvedEdges: ServiceMapEdge[] = [];
  const unresolvedExistingEdges: ServiceMapEdge[] = [];
  const newEdges: ServiceMapEdge[] = [];

  // Process edges in chunks and yield to event loop periodically
  for (let i = 0; i < edges.length; i++) {
    if (i > 0 && i % YIELD_EVERY_N_ITEMS === 0) {
      await new Promise(setImmediate);
    }

    const edge = edges[i];
    const docId = buildDocId(
      edge.edge_type === 'exit_span' ? 'exit' : 'link',
      edge.source_service,
      edge.destination_resource
    );

    const existingEdge = existingEdgesMap.get(docId);
    const isResolved = existingEdge?.isResolved === true;
    const exists = existingEdge !== undefined;

    if (isResolved) {
      // Resolved edges: skip if new iteration would set destination_service to null
      // (which it always does in compute step, so we skip them)
      resolvedEdges.push(edge);
    } else if (exists) {
      // Unresolved existing edges: only update if we have NEW samples
      // Don't replace old samples - accumulate them (they might resolve later)
      const oldSampleIds = existingEdge.currentSampleIds;
      const newSampleIds =
        edge.sample_span_ids || (edge.sample_span_id ? [edge.sample_span_id] : []);

      // Only update if we have genuinely new samples (not already in old samples)
      const hasNewSamples = newSampleIds.some((id) => !oldSampleIds.includes(id));

      if (hasNewSamples) {
        // Accumulate: old samples first (they're still valid), then add new ones
        // This way we keep trying old samples but also add fresh ones
        const accumulatedSampleIds = [
          ...oldSampleIds,
          ...newSampleIds.filter((id) => !oldSampleIds.includes(id)),
        ].slice(0, SAMPLES_PER_EDGE * 2); // Allow more samples for unresolved edges

        const updatedEdge: ServiceMapEdge = {
          ...edge,
          sample_span_id: accumulatedSampleIds[0] || edge.sample_span_id,
          sample_span_ids: accumulatedSampleIds,
        };

        unresolvedExistingEdges.push(updatedEdge);
      } else {
        // No new samples - don't update sample_span_ids, just update other fields
        // This prevents overwriting with the same samples
        unresolvedExistingEdges.push(edge);
      }
    } else {
      // New edges: upsert
      newEdges.push(edge);
    }
  }

  const skipped = resolvedEdges.length;

  // Build operations for unresolved existing edges and new edges
  const operations: object[] = [];

  // Unresolved existing edges: update fields but preserve/accumulate samples intelligently
  // Process in chunks and yield to event loop periodically
  for (let i = 0; i < unresolvedExistingEdges.length; i++) {
    if (i > 0 && i % YIELD_EVERY_N_ITEMS === 0) {
      await new Promise(setImmediate);
    }

    const edge = unresolvedExistingEdges[i];
    const docId = buildDocId(
      edge.edge_type === 'exit_span' ? 'exit' : 'link',
      edge.source_service,
      edge.destination_resource
    );

    // Get old samples for this edge
    const existingEdge = existingEdgesMap.get(docId);
    const oldSampleIds = existingEdge?.currentSampleIds || [];
    const newSampleIds = edge.sample_span_ids || (edge.sample_span_id ? [edge.sample_span_id] : []);

    // Smart sample handling:
    // - If we have new samples not in old ones, accumulate them
    // - Otherwise, preserve old samples (they're still valid to try)
    const hasNewSamples = newSampleIds.some((id) => !oldSampleIds.includes(id));
    const finalSampleIds = hasNewSamples
      ? [
          // Keep old samples (they might resolve as data becomes available)
          ...oldSampleIds,
          // Add new samples that aren't duplicates
          ...newSampleIds.filter((id) => !oldSampleIds.includes(id)),
        ].slice(0, SAMPLES_PER_EDGE * 2) // Allow more samples for unresolved edges
      : oldSampleIds.length > 0
      ? oldSampleIds // Preserve old samples if no new ones
      : newSampleIds; // Fallback to new if no old samples

    // Build update doc: always update aggregatable fields
    const updateDoc: Partial<ServiceMapEdge> = {
      source_service: edge.source_service,
      source_agent: edge.source_agent,
      source_environment: edge.source_environment,
      destination_resource: edge.destination_resource,
      span_type: edge.span_type,
      span_subtype: edge.span_subtype,
      span_count: edge.span_count,
      edge_type: edge.edge_type,
      computed_at: edge.computed_at,
    };

    // Only update sample fields if we have accumulated samples (new or preserved)
    if (finalSampleIds.length > 0) {
      updateDoc.sample_span_id = finalSampleIds[0];
      updateDoc.sample_span_ids = finalSampleIds;
    }

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
  // Process in chunks and yield to event loop periodically
  for (let i = 0; i < newEdges.length; i++) {
    if (i > 0 && i % YIELD_EVERY_N_ITEMS === 0) {
      await new Promise(setImmediate);
    }

    const edge = newEdges[i];
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

  // Process bulk operations in batches for better performance
  let totalIndexed = 0;
  let totalUpdated = 0;
  let totalCreated = 0;

  for (let i = 0; i < operations.length; i += BULK_BATCH_SIZE * 2) {
    // Each operation is 2 items (update action + doc)
    const batch = operations.slice(i, i + BULK_BATCH_SIZE * 2);
    const isLastBatch = i + BULK_BATCH_SIZE * 2 >= operations.length;

    const response = await esClient.bulk({
      refresh: isLastBatch ? 'wait_for' : false, // Only wait on last batch
      operations: batch,
    });

    const indexed = response.items.filter(
      (item) => item.update?.status === 201 || item.update?.status === 200
    ).length;
    const updated = response.items.filter((item) => item.update?.status === 200).length;
    const created = indexed - updated;

    totalIndexed += indexed;
    totalUpdated += updated;
    totalCreated += created;
  }

  logger.debug(
    `Processed ${edges.length} edges: ${totalCreated} created (new), ${totalUpdated} updated (unresolved existing), ${skipped} skipped (resolved)`
  );

  return { indexed: totalIndexed, updated: totalUpdated, created: totalCreated, skipped };
}

interface WorkflowMetadata {
  last_processed_timestamp: number;
  updated_at: string;
}

/**
 * Retrieves the last processed timestamp from the metadata document.
 * Returns null if no metadata exists (first run).
 */
export async function getLastProcessedTimestamp({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<number | null> {
  try {
    const response = await esClient.get<WorkflowMetadata>({
      index: EDGES_INDEX,
      id: METADATA_DOC_ID,
    });

    if (response.found && response._source?.last_processed_timestamp) {
      logger.debug(
        `Found last processed timestamp: ${new Date(
          response._source.last_processed_timestamp
        ).toISOString()}`
      );
      return response._source.last_processed_timestamp;
    }
  } catch (error: any) {
    // 404 is expected on first run, other errors should be logged
    if (error.statusCode !== 404) {
      logger.warn(`Failed to retrieve workflow metadata: ${error.message}`);
    }
  }

  return null;
}

/**
 * Updates the last processed timestamp in the metadata document.
 */
async function updateLastProcessedTimestamp({
  esClient,
  timestamp,
  logger,
}: {
  esClient: ElasticsearchClient;
  timestamp: number;
  logger: Logger;
}): Promise<void> {
  try {
    await esClient.index({
      index: EDGES_INDEX,
      id: METADATA_DOC_ID,
      document: {
        last_processed_timestamp: timestamp,
        updated_at: new Date().toISOString(),
      },
      refresh: false, // Don't wait for refresh, this is metadata
    });
    logger.debug(`Updated last processed timestamp: ${new Date(timestamp).toISOString()}`);
  } catch (error: any) {
    logger.warn(`Failed to update workflow metadata: ${error.message}`);
    // Don't throw - metadata update failure shouldn't fail the entire operation
  }
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

  // Update metadata after successful processing
  await updateLastProcessedTimestamp({ esClient, timestamp: end, logger });

  return {
    exitSpanEdges: exitSpanEdges.length,
    spanLinkEdges: spanLinkEdges.length,
    indexed,
    updated,
    created,
    skipped,
  };
}
