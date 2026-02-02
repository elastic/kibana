/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * 🔗 RESOLUTION
 *
 * Destination resolution - resolves exit span destinations to internal services.
 *
 * For unresolved edges (destination_service = null), queries APM data to find
 * the actual service that the exit span connects to by looking up transactions
 * with parent_id matching the exit span's sample_span_id.
 *
 * Runs separately from aggregation to handle late-arriving data.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { asMutableArray } from '../../../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_ID,
} from '../../../../../common/es_fields/apm';
import {
  EDGES_INDEX,
  RESOLUTION_BATCH_SIZE,
  MAX_TERMS_PER_QUERY,
  MAX_CONCURRENT_BATCHES,
  MAX_RESOLUTION_ATTEMPTS,
} from '../core/utils';

interface ServiceMapEdge {
  source_service: string;
  source_agent: string | null;
  source_environment: string | null;
  destination_resource: string;
  destination_service: string | null;
  destination_agent: string | null;
  destination_environment: string | null;
  span_type: string;
  span_subtype: string | null;
  span_count: number;
  edge_type: 'exit_span' | 'span_link';
  sample_spans: string[]; // Array of span IDs
  computed_at: string;
  last_seen_at?: string;
  max_span_timestamp?: number; // Maximum @timestamp of spans processed for this edge
  consecutive_misses?: number; // Number of consecutive workflow runs where edge was not seen
  resolution_attempts?: number; // Number of times we've tried to resolve this edge
  last_resolution_attempt?: string; // Last time we attempted resolution
}

export interface ResolveServiceMapDestinationsResponse {
  unresolvedExitEdges: number;
  unresolvedLinkEdges: number;
  resolved: number;
  environment?: string;
  failedBatches?: number;
  skippedDueToRetries?: number; // Edges skipped because they've been tried too many times
}

function extractDestinationInfo(fields: Record<string, unknown[]>) {
  const getValue = (field: string) => {
    const value = fields?.[field]?.[0] as string | undefined;
    return value || null;
  };

  return {
    serviceName: getValue(SERVICE_NAME),
    environment: getValue(SERVICE_ENVIRONMENT),
    agent: getValue(AGENT_NAME),
  };
}

async function getAllUnresolvedEdges({
  esClient,
  edgeType,
  environment,
  logger,
}: {
  esClient: ElasticsearchClient;
  edgeType: 'exit_span' | 'span_link';
  environment?: string;
  logger: Logger;
}): Promise<Array<{ _id: string; _source: ServiceMapEdge }>> {
  const allHits: Array<{ _id: string; _source: ServiceMapEdge }> = [];
  const pageSize = 10000;
  let searchAfter: Array<string | number> | undefined;

  do {
    const response = await esClient.search<ServiceMapEdge>({
      index: EDGES_INDEX,
      size: pageSize,
      sort: [
        { computed_at: { order: 'asc' } },
        { source_service: { order: 'asc' } },
        { destination_resource: { order: 'asc' } },
      ],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      query: {
        bool: {
          filter: [
            { term: { edge_type: edgeType } },
            { exists: { field: 'sample_spans' } },
            ...(environment !== undefined && environment !== null && environment !== ''
              ? [{ term: { source_environment: environment } }]
              : []),
          ],
          must_not: [
            { exists: { field: 'destination_service' } },
            ...(environment === null || environment === ''
              ? [{ exists: { field: 'source_environment' } }]
              : []),
          ],
        },
      },
    });

    const hits = response.hits.hits;
    if (hits.length === 0) break;

    for (const hit of hits) {
      if (hit._id && hit._source) {
        allHits.push({ _id: hit._id, _source: hit._source });
      }
    }

    const lastSort = hits[hits.length - 1]?.sort;
    if (lastSort) {
      searchAfter = lastSort as Array<string | number>;
    } else {
      break;
    }
  } while (true);

  logger.debug(`Found ${allHits.length} unresolved ${edgeType} edges`);
  return allHits;
}

export async function resolveServiceMapDestinations({
  apmEventClient,
  esClient,
  start,
  end,
  environment,
  logger,
}: {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  environment?: string;
  logger: Logger;
}): Promise<ResolveServiceMapDestinationsResponse> {
  const now = new Date().toISOString();

  const [allExitEdgeHits, allLinkEdgeHits] = await Promise.all([
    getAllUnresolvedEdges({ esClient, edgeType: 'exit_span', environment, logger }),
    getAllUnresolvedEdges({ esClient, edgeType: 'span_link', environment, logger }),
  ]);

  const filterByAttempts = (hits: typeof allExitEdgeHits) =>
    hits.filter((hit) => (hit._source?.resolution_attempts ?? 0) < MAX_RESOLUTION_ATTEMPTS);

  const exitEdgeHits = filterByAttempts(allExitEdgeHits);
  const linkEdgeHits = filterByAttempts(allLinkEdgeHits);

  const totalSkipped =
    allExitEdgeHits.length - exitEdgeHits.length + (allLinkEdgeHits.length - linkEdgeHits.length);

  if (totalSkipped > 0) {
    logger.info(
      `Skipped ${totalSkipped} edges that exceeded ${MAX_RESOLUTION_ATTEMPTS} resolution attempts`
    );
  }

  logger.debug(`Processing ${exitEdgeHits.length} exit edges, ${linkEdgeHits.length} link edges`);

  /**
   * Process a batch of exit span edges and resolve their destinations
   */
  async function processExitSpanBatch(
    bulkOperations: object[],
    batch: Array<{ _id: string; _source: ServiceMapEdge }>,
    batchNum: number,
    totalBatches: number
  ): Promise<number> {
    // Collect sample span IDs from this batch
    const allSpanIds = new Set<string>();
    // Find minimum max_span_timestamp in this batch to optimize time window
    let minMaxSpanTimestamp: number | undefined;
    for (const hit of batch) {
      const source = hit._source;
      if (source?.sample_spans && Array.isArray(source.sample_spans)) {
        for (const spanId of source.sample_spans) {
          if (spanId) {
            allSpanIds.add(spanId);
          }
        }
      }
      // Track minimum max_span_timestamp for time window optimization
      if (source?.max_span_timestamp != null) {
        minMaxSpanTimestamp =
          minMaxSpanTimestamp == null
            ? source.max_span_timestamp
            : Math.min(minMaxSpanTimestamp, source.max_span_timestamp);
      }
    }

    const spanIds = Array.from(allSpanIds);
    if (spanIds.length === 0) {
      return 0;
    }

    // Use full time window - time optimization can miss matches due to clock skew/delayed ingestion
    // The cost of querying full window is acceptable given resolution only runs on unresolved edges
    logger.debug(
      `Processing exit span batch ${batchNum}/${totalBatches}: ${batch.length} edges, ${
        spanIds.length
      } unique sample span IDs, time window: ${new Date(start).toISOString()} - ${new Date(
        end
      ).toISOString()}`
    );

    // Split span IDs into chunks if they exceed MAX_TERMS_PER_QUERY
    const spanIdChunks: string[][] = [];
    for (let i = 0; i < spanIds.length; i += MAX_TERMS_PER_QUERY) {
      spanIdChunks.push(spanIds.slice(i, i + MAX_TERMS_PER_QUERY));
    }

    // Build lookup map by querying chunks in parallel
    const destinationLookup = new Map<
      string,
      { serviceName: string | null; environment: string | null; agent: string | null }
    >();

    const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);
    const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, PARENT_ID] as const);

    // Query for transactions with matching parent.id
    // Note: We match only on parent.id (not trace.id) because sampling means the trace.id
    // we captured may not have corresponding sampled transactions. Span ID collisions are
    // extremely rare (UUIDs/random) so this is safe.
    const queryPromises = spanIdChunks.map((chunk) => {
      return apmEventClient.search('resolve_exit_span_destinations', {
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
      });
    });

    // Process queries with concurrency limit
    const results = await Promise.all(queryPromises);

    // Merge results into lookup map
    for (const txResponse of results) {
      for (const hit of txResponse.hits.hits) {
        const fields = hit.fields as Record<string, unknown[]>;
        const parentId = fields?.[PARENT_ID]?.[0] as string | undefined;
        if (parentId) {
          const destinationInfo = extractDestinationInfo(fields);
          destinationLookup.set(parentId, destinationInfo);
        }
      }
    }

    // Resolve edges in this batch
    let batchResolved = 0;
    for (const hit of batch) {
      const source = hit._source;
      if (!source) continue;

      const sampleSpans = source.sample_spans || [];

      let destination:
        | { serviceName: string | null; environment: string | null; agent: string | null }
        | undefined;
      for (const spanId of sampleSpans) {
        if (!spanId) continue;
        const found = destinationLookup.get(spanId);
        if (found) {
          destination = found as {
            serviceName: string | null;
            environment: string | null;
            agent: string | null;
          };
          break;
        }
      }

      if (destination && destination.serviceName != null) {
        bulkOperations.push(
          { update: { _index: EDGES_INDEX, _id: hit._id } },
          {
            doc: {
              destination_service: destination.serviceName,
              destination_environment: destination.environment,
              destination_agent: destination.agent,
              computed_at: now,
              // Reset resolution attempts on successful resolution
              resolution_attempts: 0,
              last_resolution_attempt: now,
            },
          }
        );
        batchResolved++;
      } else {
        // Track failed resolution attempt
        const currentAttempts = source.resolution_attempts ?? 0;
        bulkOperations.push(
          { update: { _index: EDGES_INDEX, _id: hit._id } },
          {
            doc: {
              resolution_attempts: currentAttempts + 1,
              last_resolution_attempt: now,
            },
          }
        );
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
    bulkOperations: object[],
    batch: Array<{ _id: string; _source: ServiceMapEdge }>,
    batchNum: number,
    totalBatches: number
  ): Promise<number> {
    // Collect sample span IDs from this batch
    const allLinkedSpanIds = new Set<string>();
    // Find minimum max_span_timestamp in this batch to optimize time window
    let minMaxSpanTimestamp: number | undefined;
    for (const hit of batch) {
      const source = hit._source;

      if (source?.sample_spans && Array.isArray(source.sample_spans)) {
        for (const spanId of source.sample_spans) {
          if (spanId) {
            allLinkedSpanIds.add(spanId);
          }
        }
      }
      // Track minimum max_span_timestamp for time window optimization
      if (source?.max_span_timestamp != null) {
        minMaxSpanTimestamp =
          minMaxSpanTimestamp == null
            ? source.max_span_timestamp
            : Math.min(minMaxSpanTimestamp, source.max_span_timestamp);
      }
    }

    const linkedSpanIds = Array.from(allLinkedSpanIds);
    if (linkedSpanIds.length === 0) {
      return 0;
    }

    // Use full time window - span links can reference spans from any time
    logger.debug(
      `Processing span link batch ${batchNum}/${totalBatches}: ${batch.length} edges, ${
        linkedSpanIds.length
      } unique sample span IDs, time window: ${new Date(start).toISOString()} - ${new Date(
        end
      ).toISOString()}`
    );

    // Split span IDs into chunks if they exceed MAX_TERMS_PER_QUERY
    const spanIdChunks: string[][] = [];
    for (let i = 0; i < linkedSpanIds.length; i += MAX_TERMS_PER_QUERY) {
      spanIdChunks.push(linkedSpanIds.slice(i, i + MAX_TERMS_PER_QUERY));
    }

    // Build lookup map by querying chunks in parallel
    const linkDestinationLookup = new Map<
      string,
      { serviceName: string | null; environment: string | null; agent: string | null }
    >();

    const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);
    const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, SPAN_ID] as const);

    // Query for spans with matching span.id
    // Note: We match only on span.id (not trace.id) because sampling means the trace.id
    // we captured may not have corresponding sampled spans. Span ID collisions are
    // extremely rare (UUIDs/random) so this is safe.
    const queryPromises = spanIdChunks.map((chunk) => {
      return apmEventClient.search('resolve_span_link_destinations', {
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
      });
    });

    // Process queries with concurrency limit
    const results = await Promise.all(queryPromises);

    // Merge results into lookup map
    for (const spanResponse of results) {
      for (const hit of spanResponse.hits.hits) {
        const fields = hit.fields as Record<string, unknown[]>;
        const spanId = fields?.[SPAN_ID]?.[0] as string | undefined;
        if (spanId) {
          const destinationInfo = extractDestinationInfo(fields);
          linkDestinationLookup.set(spanId, destinationInfo);
        }
      }
    }

    // Resolve edges in this batch
    let batchResolved = 0;
    for (const hit of batch) {
      const source = hit._source;
      if (!source) continue;

      const sampleSpans = source.sample_spans || [];

      let destination:
        | { serviceName: string | null; environment: string | null; agent: string | null }
        | undefined;
      for (const spanId of sampleSpans) {
        if (!spanId) continue;
        const found = linkDestinationLookup.get(spanId);
        if (found) {
          destination = found as {
            serviceName: string | null;
            environment: string | null;
            agent: string | null;
          };
          break;
        }
      }

      if (destination && destination.serviceName != null) {
        bulkOperations.push(
          { update: { _index: EDGES_INDEX, _id: hit._id } },
          {
            doc: {
              destination_service: destination.serviceName,
              destination_environment: destination.environment,
              destination_agent: destination.agent,
              computed_at: now,
              // Reset resolution attempts on successful resolution
              resolution_attempts: 0,
              last_resolution_attempt: now,
            },
          }
        );
        batchResolved++;
      } else {
        // Track failed resolution attempt
        const currentAttempts = source.resolution_attempts ?? 0;
        bulkOperations.push(
          { update: { _index: EDGES_INDEX, _id: hit._id } },
          {
            doc: {
              resolution_attempts: currentAttempts + 1,
              last_resolution_attempt: now,
            },
          }
        );
      }
    }

    logger.debug(
      `Span link batch ${batchNum}/${totalBatches}: resolved ${batchResolved}/${batch.length} edges`
    );
    return batchResolved;
  }

  /**
   * Process batches with concurrency control and error handling
   */
  async function processBatchesWithConcurrency<T>(
    bulkOperations: object[],
    items: T[],
    batchSize: number,
    processor: (
      bulkOps: object[],
      batch: T[],
      batchNum: number,
      totalBatches: number
    ) => Promise<number>,
    maxConcurrency: number,
    edgeType: string
  ): Promise<{ resolved: number; failedBatches: number }> {
    const batches: Array<{ batch: T[]; batchNum: number }> = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push({
        batch: items.slice(i, i + batchSize),
        batchNum: Math.floor(i / batchSize) + 1,
      });
    }

    let totalResolved = 0;
    let failedBatches = 0;
    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += maxConcurrency) {
      const concurrentBatches = batches.slice(i, i + maxConcurrency);
      const results = await Promise.allSettled(
        concurrentBatches.map(({ batch, batchNum }) =>
          processor(bulkOperations, batch, batchNum, batches.length)
        )
      );

      // Handle results and track failures
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          totalResolved += result.value;
        } else {
          failedBatches++;
          const batchNum = concurrentBatches[idx].batchNum;
          logger.warn(
            `${edgeType} batch ${batchNum} failed: ${result.reason?.message || result.reason}`,
            { error: result.reason }
          );
        }
      });

      // Execute bulk operations periodically to avoid memory buildup
      if (bulkOperations.length >= 5000) {
        await esClient.bulk({
          refresh: false,
          operations: bulkOperations.splice(0, bulkOperations.length),
        });
      }
    }

    return { resolved: totalResolved, failedBatches };
  }

  // Process exit span edges and link edges in parallel with separate operations arrays
  const processingPromises: Array<
    Promise<{ resolved: number; failedBatches: number; operations: object[] }>
  > = [];

  if (exitEdgeHits.length > 0) {
    const totalBatches = Math.ceil(exitEdgeHits.length / RESOLUTION_BATCH_SIZE);
    logger.debug(
      `Processing ${exitEdgeHits.length} unresolved exit edges in ${totalBatches} batches of up to ${RESOLUTION_BATCH_SIZE} edges (max ${MAX_CONCURRENT_BATCHES} concurrent)`
    );

    const exitBulkOperations: object[] = [];
    processingPromises.push(
      processBatchesWithConcurrency(
        exitBulkOperations,
        exitEdgeHits,
        RESOLUTION_BATCH_SIZE,
        processExitSpanBatch,
        MAX_CONCURRENT_BATCHES,
        'exit_span'
      ).then((result) => ({ ...result, operations: exitBulkOperations }))
    );
  }

  if (linkEdgeHits.length > 0) {
    const totalBatches = Math.ceil(linkEdgeHits.length / RESOLUTION_BATCH_SIZE);
    logger.debug(
      `Processing ${linkEdgeHits.length} unresolved span link edges in ${totalBatches} batches of up to ${RESOLUTION_BATCH_SIZE} edges (max ${MAX_CONCURRENT_BATCHES} concurrent)`
    );

    const linkBulkOperations: object[] = [];
    processingPromises.push(
      processBatchesWithConcurrency(
        linkBulkOperations,
        linkEdgeHits,
        RESOLUTION_BATCH_SIZE,
        processSpanLinkBatch,
        MAX_CONCURRENT_BATCHES,
        'span_link'
      ).then((result) => ({ ...result, operations: linkBulkOperations }))
    );
  }

  // Wait for both exit and link edge processing to complete
  const results = await Promise.all(processingPromises);
  let resolvedCount = 0;
  let totalFailedBatches = 0;
  const allBulkOperations: object[] = [];

  for (const result of results) {
    resolvedCount += result.resolved;
    totalFailedBatches += result.failedBatches;
    allBulkOperations.push(...result.operations);
  }

  // Execute all bulk operations
  if (allBulkOperations.length > 0) {
    await esClient.bulk({
      refresh: true,
      operations: allBulkOperations,
    });
  }

  logger.debug(
    `Resolution complete: ${resolvedCount} edges resolved out of ${
      exitEdgeHits.length + linkEdgeHits.length
    } unresolved (${exitEdgeHits.length} exit, ${linkEdgeHits.length} link)` +
      (totalFailedBatches > 0 ? `, ${totalFailedBatches} batches failed` : '')
  );

  return {
    unresolvedExitEdges: exitEdgeHits.length,
    unresolvedLinkEdges: linkEdgeHits.length,
    resolved: resolvedCount,
    ...(environment && { environment }),
    ...(totalFailedBatches > 0 && { failedBatches: totalFailedBatches }),
    ...(totalSkipped > 0 && { skippedDueToRetries: totalSkipped }),
  };
}
