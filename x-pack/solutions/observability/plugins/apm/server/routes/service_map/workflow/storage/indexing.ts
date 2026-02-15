/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * 💾 STORAGE
 *
 * Edge indexing and persistence to Elasticsearch.
 *
 * Handles:
 * - Bulk indexing of aggregated edges
 * - Updating existing edges with new samples
 * - Skipping already-resolved edges
 * - Managing sample span IDs for later resolution
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ServiceMapEdge } from '../core/types';
import { buildDocId, EDGES_INDEX, normalizeEmptyToNull } from '../core/utils';

const BULK_BATCH_SIZE = 10000;
const YIELD_FREQUENCY = 50;
const YIELD_FREQUENCY_LARGE_BATCH = 200;
const SAMPLES_PER_EDGE = 5;
const MAX_CONCURRENT_SEARCHES = 5;
const EXISTING_EDGE_CHUNK_SIZE = 1000;

interface ExistingEdgeInfo {
  isResolved: boolean;
  currentSamples: string[]; // Array of span IDs
  currentMaxSpanTimestamp?: number;
}

/**
 * Get existing edges from the index
 */
export async function getExistingEdges({
  esClient,
  docIds,
  logger,
}: {
  esClient: ElasticsearchClient;
  docIds: string[];
  logger: Logger;
}): Promise<{
  resolvedEdgeIds: Set<string>;
  existingEdgesMap: Map<string, ExistingEdgeInfo>;
}> {
  const resolvedEdgeIds = new Set<string>();
  const existingEdgesMap = new Map<string, ExistingEdgeInfo>();

  if (docIds.length === 0) {
    return { resolvedEdgeIds, existingEdgesMap };
  }

  const searches: Array<Record<string, unknown>> = [];

  // First search: Find all resolved edges
  searches.push(
    { index: EDGES_INDEX },
    {
      size: docIds.length,
      _source: false,
      query: {
        bool: {
          filter: [{ ids: { values: docIds } }, { exists: { field: 'destination_service' } }],
        },
      },
    }
  );

  // Additional searches: Get unresolved edges in chunks
  for (let i = 0; i < docIds.length; i += EXISTING_EDGE_CHUNK_SIZE) {
    const chunk = docIds.slice(i, i + EXISTING_EDGE_CHUNK_SIZE);
    searches.push(
      { index: EDGES_INDEX },
      {
        size: chunk.length,
        _source: ['destination_service', 'sample_span_ids', 'max_span_timestamp'],
        query: { ids: { values: chunk } },
      }
    );
  }

  // Execute searches in parallel batches
  const searchPromises: Array<Promise<any>> = [];
  for (let i = 0; i < searches.length; i += MAX_CONCURRENT_SEARCHES * 2) {
    const batchSearches = searches.slice(i, i + MAX_CONCURRENT_SEARCHES * 2);
    if (batchSearches.length > 0) {
      searchPromises.push(esClient.msearch({ searches: batchSearches }));
    }
  }

  const msearchResponses = await Promise.all(searchPromises);
  const msearchResponse = {
    responses: msearchResponses.flatMap((response) => response.responses),
  };

  // Process resolved edges
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

  // Process unresolved edges
  for (let i = 1; i < msearchResponse.responses.length; i++) {
    const response = msearchResponse.responses[i];
    if (!response || !('hits' in response)) continue;

    const yieldFrequency =
      response.hits.hits.length > 10000 ? YIELD_FREQUENCY_LARGE_BATCH : YIELD_FREQUENCY;

    for (let j = 0; j < response.hits.hits.length; j++) {
      if (j > 0 && j % yieldFrequency === 0) {
        await new Promise(setImmediate);
      }

      const hit = response.hits.hits[j];
      if (!hit._id || resolvedEdgeIds.has(hit._id)) continue;

      const source = hit._source as ServiceMapEdge | undefined;
      if (source) {
        const hasResolvedDestination =
          source?.destination_service != null && source.destination_service !== '';
        const currentSamples: string[] = [];
        if (source?.sample_spans && Array.isArray(source.sample_spans)) {
          currentSamples.push(
            ...source.sample_spans.filter((spanId) => typeof spanId === 'string' && !!spanId)
          );
        }

        existingEdgesMap.set(hit._id, {
          isResolved: hasResolvedDestination,
          currentSamples,
          currentMaxSpanTimestamp: source?.max_span_timestamp,
        });
      }
    }
  }

  // Mark resolved edges in map
  for (const resolvedId of resolvedEdgeIds) {
    existingEdgesMap.set(resolvedId, {
      isResolved: true,
      currentSamples: [],
    });
  }

  return { resolvedEdgeIds, existingEdgesMap };
}

/**
 * Index edges to Elasticsearch
 */
export async function indexEdges({
  esClient,
  edges,
  logger,
  endTimestamp,
  existingEdgesMap,
}: {
  esClient: ElasticsearchClient;
  edges: ServiceMapEdge[];
  logger: Logger;
  endTimestamp?: number;
  existingEdgesMap: Map<string, ExistingEdgeInfo>;
}): Promise<{ indexed: number; updated: number; created: number; skipped: number }> {
  if (edges.length === 0) {
    logger.debug('No edges to index');
    return { indexed: 0, updated: 0, created: 0, skipped: 0 };
  }

  interface CategorizedEdge {
    edge: ServiceMapEdge;
    docId: string;
    existingEdge?: ExistingEdgeInfo;
  }

  const resolvedEdges: CategorizedEdge[] = [];
  const unresolvedExistingEdges: CategorizedEdge[] = [];
  const newEdges: CategorizedEdge[] = [];

  // Categorize edges
  for (const edge of edges) {
    const docId = buildDocId(
      edge.edge_type === 'exit_span' ? 'exit' : 'link',
      edge.source_service,
      edge.source_environment ?? '',
      edge.source_agent ?? '',
      edge.destination_resource
    );

    const existingEdge = existingEdgesMap.get(docId);
    const isResolved = existingEdge?.isResolved === true;
    const exists = existingEdge !== undefined;

    const categorizedEdge: CategorizedEdge = { edge, docId, existingEdge };

    if (isResolved) {
      resolvedEdges.push(categorizedEdge);
    } else if (exists) {
      unresolvedExistingEdges.push(categorizedEdge);
    } else {
      newEdges.push(categorizedEdge);
    }
  }

  const skipped = resolvedEdges.length;
  const operations: object[] = [];

  // Process unresolved existing edges
  const yieldFrequencyUnresolved =
    unresolvedExistingEdges.length > 10000 ? YIELD_FREQUENCY_LARGE_BATCH : YIELD_FREQUENCY;

  for (let i = 0; i < unresolvedExistingEdges.length; i++) {
    if (i > 0 && i % yieldFrequencyUnresolved === 0) {
      await new Promise(setImmediate);
    }

    const { edge, docId, existingEdge } = unresolvedExistingEdges[i];
    const oldSamples = existingEdge?.currentSamples || [];
    const oldMaxTimestamp = existingEdge?.currentMaxSpanTimestamp;
    const newSamples = edge.sample_spans || [];

    // Merge samples, deduplicating by span_id
    const sampleSet = new Set<string>();
    for (const spanId of oldSamples) {
      sampleSet.add(spanId);
    }
    for (const spanId of newSamples) {
      sampleSet.add(spanId);
    }
    const finalSamples = Array.from(sampleSet).slice(0, SAMPLES_PER_EDGE * 2);

    const finalMaxTimestamp =
      oldMaxTimestamp != null && edge.max_span_timestamp != null
        ? Math.max(oldMaxTimestamp, edge.max_span_timestamp)
        : edge.max_span_timestamp ?? oldMaxTimestamp ?? endTimestamp ?? undefined;

    const updateDoc: Partial<ServiceMapEdge> = {
      source_service: edge.source_service,
      source_agent: normalizeEmptyToNull(edge.source_agent),
      source_environment: normalizeEmptyToNull(edge.source_environment),
      destination_resource: edge.destination_resource,
      span_type: edge.span_type,
      span_subtype: normalizeEmptyToNull(edge.span_subtype),
      span_count: edge.span_count,
      edge_type: edge.edge_type,
      computed_at: edge.computed_at,
      last_seen_at: edge.computed_at, // Track when edge was last seen
      consecutive_misses: 0, // Reset since we're seeing it now
    };

    if (finalMaxTimestamp != null) {
      updateDoc.max_span_timestamp = finalMaxTimestamp;
    }

    if (finalSamples.length > 0) {
      updateDoc.sample_spans = finalSamples;
    }

    if (edge.destination_service != null) {
      updateDoc.destination_service = edge.destination_service;
      updateDoc.destination_agent = normalizeEmptyToNull(edge.destination_agent);
      updateDoc.destination_environment = normalizeEmptyToNull(edge.destination_environment);
    }

    operations.push({ update: { _index: EDGES_INDEX, _id: docId } }, { doc: updateDoc });
  }

  // Process new edges
  const yieldFrequencyNew = newEdges.length > 10000 ? YIELD_FREQUENCY_LARGE_BATCH : YIELD_FREQUENCY;

  for (let i = 0; i < newEdges.length; i++) {
    if (i > 0 && i % yieldFrequencyNew === 0) {
      await new Promise(setImmediate);
    }

    const { edge, docId } = newEdges[i];
    const edgeWithTimestamp: ServiceMapEdge = {
      ...edge,
      source_agent: normalizeEmptyToNull(edge.source_agent),
      source_environment: normalizeEmptyToNull(edge.source_environment),
      span_subtype: normalizeEmptyToNull(edge.span_subtype),
      destination_agent: normalizeEmptyToNull(edge.destination_agent),
      destination_environment: normalizeEmptyToNull(edge.destination_environment),
      max_span_timestamp: edge.max_span_timestamp ?? endTimestamp ?? undefined,
      last_seen_at: edge.computed_at, // Track when edge was first/last seen
      consecutive_misses: 0, // Initialize to 0 for new edges
    };

    operations.push(
      { update: { _index: EDGES_INDEX, _id: docId } },
      { doc: edgeWithTimestamp, upsert: edgeWithTimestamp }
    );
  }

  if (operations.length === 0) {
    logger.debug(`Skipped all ${skipped} edges (already resolved)`);
    return { indexed: 0, updated: 0, created: 0, skipped };
  }

  // Bulk index
  let totalIndexed = 0;
  let totalUpdated = 0;
  let totalCreated = 0;

  for (let i = 0; i < operations.length; i += BULK_BATCH_SIZE * 2) {
    const batch = operations.slice(i, i + BULK_BATCH_SIZE * 2);
    const response = await esClient.bulk({ refresh: false, operations: batch });

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
    `Processed ${edges.length} edges: ${totalCreated} created, ${totalUpdated} updated, ${skipped} skipped`
  );

  return { indexed: totalIndexed, updated: totalUpdated, created: totalCreated, skipped };
}
