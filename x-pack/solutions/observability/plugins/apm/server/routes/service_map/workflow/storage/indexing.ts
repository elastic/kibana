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

interface ExistingEdgeInfo {
  isResolved: boolean;
  currentSamples: string[];
  currentMaxSpanTimestamp?: number;
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
    const prefix =
      edge.edge_type === 'exit_span' ? 'exit' : edge.edge_type === 'span_link' ? 'link' : 'ilink';
    const docId = buildDocId(
      prefix,
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
    const fullEdge: ServiceMapEdge = {
      ...edge,
      source_agent: normalizeEmptyToNull(edge.source_agent),
      source_environment: normalizeEmptyToNull(edge.source_environment),
      span_subtype: normalizeEmptyToNull(edge.span_subtype),
      destination_agent: normalizeEmptyToNull(edge.destination_agent),
      destination_environment: normalizeEmptyToNull(edge.destination_environment),
      max_span_timestamp: edge.max_span_timestamp ?? endTimestamp ?? undefined,
      last_seen_at: edge.computed_at,
      consecutive_misses: 0,
    };

    // For updates: exclude destination_* fields so we don't overwrite resolved values.
    // Aggregation always sets destination_service: null — if we include it in the doc,
    // it wipes previously resolved destinations. Resolution is the only step that should
    // set destination_* fields.
    const {
      destination_service: _ds,
      destination_agent: _da,
      destination_environment: _de,
      ...updateFields
    } = fullEdge;

    operations.push(
      { update: { _index: EDGES_INDEX, _id: docId } },
      { doc: updateFields, upsert: fullEdge }
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
