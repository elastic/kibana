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
const RESOLUTION_BATCH_SIZE = 2000; // Increased batch size for better throughput
const MAX_TERMS_PER_QUERY = 10000; // Limit terms query size for better performance
const MAX_CONCURRENT_BATCHES = 3; // Process multiple batches concurrently

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
  sample_span_ids?: string[];
  computed_at: string;
}

export interface ResolveServiceMapDestinationsResponse {
  unresolvedExitEdges: number;
  unresolvedLinkEdges: number;
  resolved: number;
}

/**
 * Paginate through all unresolved edges of a given type
 */
async function getAllUnresolvedEdges({
  esClient,
  edgeType,
  logger,
}: {
  esClient: ElasticsearchClient;
  edgeType: 'exit_span' | 'span_link';
  logger: Logger;
}): Promise<Array<{ _id: string; _source: ServiceMapEdge }>> {
  const allHits: Array<{ _id: string; _source: ServiceMapEdge }> = [];
  const pageSize = 1000;
  // search_after can contain mixed types: date (number/string) + strings
  let searchAfter: Array<string | number> | undefined;

  do {
    const response = await esClient.search<ServiceMapEdge>({
      index: EDGES_INDEX,
      size: pageSize,
      // Use computed_at + source_service + destination_resource for stable pagination
      // These fields uniquely identify each edge (same as doc ID)
      sort: [
        { computed_at: { order: 'asc' } },
        { source_service: { order: 'asc' } },
        { destination_resource: { order: 'asc' } },
      ],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      query: {
        bool: {
          filter: [{ term: { edge_type: edgeType } }, { exists: { field: 'sample_span_id' } }],
          must_not: [{ exists: { field: 'destination_service' } }],
        },
      },
    });

    const hits = response.hits.hits;
    if (hits.length === 0) {
      break;
    }

    for (const hit of hits) {
      if (hit._id && hit._source) {
        allHits.push({ _id: hit._id, _source: hit._source });
      }
    }

    // Get search_after from last hit for next page
    // Sort values: [computed_at (number/string), source_service (string), destination_resource (string)]
    if (hits.length > 0 && hits[hits.length - 1].sort) {
      searchAfter = hits[hits.length - 1].sort as Array<string | number>;
    } else {
      break;
    }
  } while (true);

  logger.debug(`Paginated through ${allHits.length} unresolved ${edgeType} edges`);
  return allHits;
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

  // Get all unresolved exit span edges (paginated)
  const exitEdgeHits = await getAllUnresolvedEdges({
    esClient,
    edgeType: 'exit_span',
    logger,
  });

  // Get all unresolved span link edges (paginated)
  const linkEdgeHits = await getAllUnresolvedEdges({
    esClient,
    edgeType: 'span_link',
    logger,
  });

  logger.debug(
    `Found ${exitEdgeHits.length} unresolved exit edges, ${
      linkEdgeHits.length
    } unresolved link edges (total: ${exitEdgeHits.length + linkEdgeHits.length})`
  );

  let resolvedCount = 0;
  const bulkOperations: object[] = [];

  /**
   * Process a batch of exit span edges and resolve their destinations
   */
  async function processExitSpanBatch(
    batch: Array<{ _id: string; _source: ServiceMapEdge }>,
    batchNum: number,
    totalBatches: number
  ): Promise<number> {
    // Collect sample span IDs from this batch
    const allSpanIds = new Set<string>();
    for (const hit of batch) {
      const source = hit._source;
      if (source?.sample_span_id) {
        allSpanIds.add(source.sample_span_id);
      }
      if (source?.sample_span_ids && Array.isArray(source.sample_span_ids)) {
        for (const id of source.sample_span_ids) {
          if (id) allSpanIds.add(id);
        }
      }
    }

    const spanIds = Array.from(allSpanIds);
    if (spanIds.length === 0) {
      return 0;
    }

    logger.debug(
      `Processing exit span batch ${batchNum}/${totalBatches}: ${batch.length} edges, ${spanIds.length} unique sample span IDs`
    );

    // Split span IDs into chunks if they exceed MAX_TERMS_PER_QUERY
    const spanIdChunks: string[][] = [];
    for (let i = 0; i < spanIds.length; i += MAX_TERMS_PER_QUERY) {
      spanIdChunks.push(spanIds.slice(i, i + MAX_TERMS_PER_QUERY));
    }

    // Build lookup map by querying chunks in parallel
    const destinationLookup = new Map<
      string,
      { serviceName: string; environment: string; agent: string }
    >();

    const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);
    const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, PARENT_ID] as const);

    // Process query chunks in parallel (with concurrency limit)
    const queryPromises = spanIdChunks.map((chunk) =>
      apmEventClient.search('resolve_exit_span_destinations', {
        apm: {
          events: [ProcessorEvent.transaction],
        },
        track_total_hits: false,
        size: Math.min(chunk.length, 5000),
        query: {
          bool: {
            filter: [...rangeQuery(start, end), ...termsQuery(PARENT_ID, ...chunk)],
          },
        },
        fields: [...requiredFields, ...optionalFields],
      })
    );

    // Process queries with concurrency limit
    const results = await Promise.all(queryPromises);

    // Merge results into lookup map
    for (const txResponse of results) {
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
    }

    // Resolve edges in this batch
    let batchResolved = 0;
    for (const hit of batch) {
      const source = hit._source;
      if (!source) continue;

      const sampleIds =
        source.sample_span_ids && Array.isArray(source.sample_span_ids)
          ? source.sample_span_ids
          : source.sample_span_id
          ? [source.sample_span_id]
          : [];

      let destination: { serviceName: string; environment: string; agent: string } | undefined;
      for (const spanId of sampleIds) {
        if (!spanId) continue;
        const found = destinationLookup.get(spanId);
        if (found) {
          destination = found;
          break;
        }
      }

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
        batchResolved++;
      }
    }

    logger.debug(
      `Exit span batch ${batchNum}/${totalBatches}: resolved ${batchResolved}/${batch.length} edges`
    );
    return batchResolved;
  }

  /**
   * Process a batch of span link edges and resolve their destinations
   */
  async function processSpanLinkBatch(
    batch: Array<{ _id: string; _source: ServiceMapEdge }>,
    batchNum: number,
    totalBatches: number
  ): Promise<number> {
    // Collect sample span IDs from this batch
    const allLinkedSpanIds = new Set<string>();
    for (const hit of batch) {
      const source = hit._source;
      if (source?.sample_span_id) {
        allLinkedSpanIds.add(source.sample_span_id);
      }
      if (source?.sample_span_ids && Array.isArray(source.sample_span_ids)) {
        for (const id of source.sample_span_ids) {
          if (id) allLinkedSpanIds.add(id);
        }
      }
    }

    const linkedSpanIds = Array.from(allLinkedSpanIds);
    if (linkedSpanIds.length === 0) {
      return 0;
    }

    logger.debug(
      `Processing span link batch ${batchNum}/${totalBatches}: ${batch.length} edges, ${linkedSpanIds.length} unique sample span IDs`
    );

    // Split span IDs into chunks if they exceed MAX_TERMS_PER_QUERY
    const spanIdChunks: string[][] = [];
    for (let i = 0; i < linkedSpanIds.length; i += MAX_TERMS_PER_QUERY) {
      spanIdChunks.push(linkedSpanIds.slice(i, i + MAX_TERMS_PER_QUERY));
    }

    // Build lookup map by querying chunks in parallel
    const linkDestinationLookup = new Map<
      string,
      { serviceName: string; environment: string; agent: string }
    >();

    const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);
    const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, SPAN_ID] as const);

    // Process query chunks in parallel
    const queryPromises = spanIdChunks.map((chunk) =>
      apmEventClient.search('resolve_span_link_destinations', {
        apm: {
          events: [ProcessorEvent.span],
        },
        track_total_hits: false,
        size: Math.min(chunk.length, 5000),
        query: {
          bool: {
            filter: [...rangeQuery(start, end), ...termsQuery(SPAN_ID, ...chunk)],
          },
        },
        fields: [...requiredFields, ...optionalFields],
      })
    );

    // Process queries with concurrency limit
    const results = await Promise.all(queryPromises);

    // Merge results into lookup map
    for (const spanResponse of results) {
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
    }

    // Resolve edges in this batch
    let batchResolved = 0;
    for (const hit of batch) {
      const source = hit._source;
      if (!source) continue;

      const sampleIds =
        source.sample_span_ids && Array.isArray(source.sample_span_ids)
          ? source.sample_span_ids
          : source.sample_span_id
          ? [source.sample_span_id]
          : [];

      let destination: { serviceName: string; environment: string; agent: string } | undefined;
      for (const spanId of sampleIds) {
        if (!spanId) continue;
        const found = linkDestinationLookup.get(spanId);
        if (found) {
          destination = found;
          break;
        }
      }

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
        batchResolved++;
      }
    }

    logger.debug(
      `Span link batch ${batchNum}/${totalBatches}: resolved ${batchResolved}/${batch.length} edges`
    );
    return batchResolved;
  }

  /**
   * Process batches with concurrency control
   */
  async function processBatchesWithConcurrency<T>(
    items: T[],
    batchSize: number,
    processor: (batch: T[], batchNum: number, totalBatches: number) => Promise<number>,
    maxConcurrency: number
  ): Promise<number> {
    const batches: Array<{ batch: T[]; batchNum: number }> = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push({
        batch: items.slice(i, i + batchSize),
        batchNum: Math.floor(i / batchSize) + 1,
      });
    }

    let totalResolved = 0;
    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += maxConcurrency) {
      const concurrentBatches = batches.slice(i, i + maxConcurrency);
      const results = await Promise.all(
        concurrentBatches.map(({ batch, batchNum }) => processor(batch, batchNum, batches.length))
      );
      totalResolved += results.reduce((sum, count) => sum + count, 0);

      // Execute bulk operations periodically to avoid memory buildup
      if (bulkOperations.length >= 5000) {
        await esClient.bulk({
          refresh: false,
          operations: bulkOperations.splice(0, bulkOperations.length),
        });
      }
    }

    return totalResolved;
  }

  // Process exit span edges in batches (with concurrency)
  if (exitEdgeHits.length > 0) {
    const totalBatches = Math.ceil(exitEdgeHits.length / RESOLUTION_BATCH_SIZE);
    logger.debug(
      `Processing ${exitEdgeHits.length} unresolved exit edges in ${totalBatches} batches of up to ${RESOLUTION_BATCH_SIZE} edges (max ${MAX_CONCURRENT_BATCHES} concurrent)`
    );

    const batchResolved = await processBatchesWithConcurrency(
      exitEdgeHits,
      RESOLUTION_BATCH_SIZE,
      processExitSpanBatch,
      MAX_CONCURRENT_BATCHES
    );
    resolvedCount += batchResolved;
  }

  // Process span link edges in batches (with concurrency)
  if (linkEdgeHits.length > 0) {
    const totalBatches = Math.ceil(linkEdgeHits.length / RESOLUTION_BATCH_SIZE);
    logger.debug(
      `Processing ${linkEdgeHits.length} unresolved span link edges in ${totalBatches} batches of up to ${RESOLUTION_BATCH_SIZE} edges (max ${MAX_CONCURRENT_BATCHES} concurrent)`
    );

    const batchResolved = await processBatchesWithConcurrency(
      linkEdgeHits,
      RESOLUTION_BATCH_SIZE,
      processSpanLinkBatch,
      MAX_CONCURRENT_BATCHES
    );
    resolvedCount += batchResolved;
  }

  // Execute remaining bulk operations
  if (bulkOperations.length > 0) {
    await esClient.bulk({
      refresh: true,
      operations: bulkOperations,
    });
  }

  logger.debug(
    `Resolution complete: ${resolvedCount} edges resolved out of ${
      exitEdgeHits.length + linkEdgeHits.length
    } unresolved (${exitEdgeHits.length} exit, ${linkEdgeHits.length} link)`
  );

  return {
    unresolvedExitEdges: exitEdgeHits.length,
    unresolvedLinkEdges: linkEdgeHits.length,
    resolved: resolvedCount,
  };
}
