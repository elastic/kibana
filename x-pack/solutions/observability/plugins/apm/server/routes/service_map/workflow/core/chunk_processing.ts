/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/**
 * 🛠️ UTILITIES
 *
 * Time window chunking and parallel processing utilities.
 *
 * Splits large time ranges into manageable chunks and processes them
 * with controlled concurrency to avoid overwhelming ES/Kibana.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { aggregateExitSpanEdges, aggregateSpanLinkEdges } from '../aggregation/aggregation';
import { indexEdges } from '../storage/indexing';

export interface TimeWindow {
  start: number;
  end: number;
}

export interface ProcessedWindow {
  window_start: number;
  window_end: number;
  processed_at: string;
  edge_count: number;
  status: 'complete' | 'failed';
  edge_type: 'exit_span' | 'span_link';
  error?: string;
}

export interface ChunkProcessingResult {
  indexed: number;
  updated: number;
  created: number;
  skipped: number;
  edgeCount: number;
  chunkIndex: number;
  start: number;
  end: number;
  success: boolean;
  error?: string;
}

/**
 * ES index for tracking processed windows
 */
export const WORKFLOW_WINDOWS_INDEX = '.apm-service-map-workflow-windows';

/**
 * Reprocess windows within this time buffer (handles late spans)
 */
const REPROCESS_BUFFER_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get processed windows from ES to skip redundant work
 */
async function getProcessedWindows({
  esClient,
  start,
  end,
  edgeType,
  logger,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  edgeType: 'exit_span' | 'span_link';
  logger: Logger;
}): Promise<Set<string>> {
  try {
    const response = await esClient.search<ProcessedWindow>({
      index: WORKFLOW_WINDOWS_INDEX,
      query: {
        bool: {
          filter: [
            { term: { status: 'complete' } },
            { term: { edge_type: edgeType } },
            {
              range: {
                window_start: { lte: end },
              },
            },
            {
              range: {
                window_end: { gte: start },
              },
            },
          ],
        },
      },
      size: 10000,
      _source: ['window_start', 'window_end'],
    });

    const processedSet = new Set<string>();
    for (const hit of response.hits.hits) {
      const source = hit._source as ProcessedWindow;
      processedSet.add(`${source.window_start}-${source.window_end}`);
    }

    logger.debug(`Found ${processedSet.size} already-processed windows for ${edgeType}`);
    return processedSet;
  } catch (error) {
    if (
      error instanceof Error &&
      'meta' in error &&
      (error as any).meta?.body?.error?.type === 'index_not_found_exception'
    ) {
      logger.debug(`Processed windows index not found, treating all windows as new`);
      return new Set();
    }
    logger.warn(`Failed to get processed windows: ${error}`, { error });
    return new Set();
  }
}

/**
 * Mark a window as processed in ES
 */
async function markWindowProcessed({
  esClient,
  window,
  edgeType,
  edgeCount,
  success,
  error,
  logger,
}: {
  esClient: ElasticsearchClient;
  window: TimeWindow;
  edgeType: 'exit_span' | 'span_link';
  edgeCount: number;
  success: boolean;
  error?: string;
  logger: Logger;
}): Promise<void> {
  try {
    const doc: ProcessedWindow = {
      window_start: window.start,
      window_end: window.end,
      processed_at: new Date().toISOString(),
      edge_count: edgeCount,
      status: success ? 'complete' : 'failed',
      edge_type: edgeType,
      ...(error && { error }),
    };

    await esClient.index({
      index: WORKFLOW_WINDOWS_INDEX,
      document: doc,
      refresh: 'wait_for',
    });

    logger.debug(
      `Marked window ${new Date(window.start).toISOString()} - ${new Date(
        window.end
      ).toISOString()} as ${success ? 'complete' : 'failed'} (${edgeCount} edges)`
    );
  } catch (err) {
    logger.warn(`Failed to mark window as processed: ${err}`, { error: err });
  }
}

/**
 * Filter windows to skip already-processed ones (outside reprocessing buffer)
 */
export async function filterUnprocessedWindows({
  esClient,
  windows,
  edgeType,
  now,
  logger,
}: {
  esClient: ElasticsearchClient;
  windows: TimeWindow[];
  edgeType: 'exit_span' | 'span_link';
  now: number;
  logger: Logger;
}): Promise<TimeWindow[]> {
  if (windows.length === 0) return [];

  const firstWindow = windows[0];
  const lastWindow = windows[windows.length - 1];

  const processedSet = await getProcessedWindows({
    esClient,
    start: firstWindow.start,
    end: lastWindow.end,
    edgeType,
    logger,
  });

  const reprocessThreshold = now - REPROCESS_BUFFER_MS;

  const unprocessedWindows = windows.filter((window) => {
    const windowKey = `${window.start}-${window.end}`;

    // Always process windows within reprocessing buffer (handles late spans)
    if (window.end >= reprocessThreshold) {
      return true;
    }

    // Skip if already processed and outside buffer
    if (processedSet.has(windowKey)) {
      logger.debug(`Skipping already-processed window: ${windowKey}`);
      return false;
    }

    return true;
  });

  logger.info(
    `Filtered ${windows.length} windows → ${unprocessedWindows.length} to process (${
      windows.length - unprocessedWindows.length
    } already complete)`
  );

  return unprocessedWindows;
}

/**
 * Calculate time windows for chunked processing
 */
export function calculateTimeWindows(
  start: number,
  end: number,
  chunkSizeMinutes = 5 // Reduced from 15 to 5 minutes to prevent ES query timeouts
): TimeWindow[] {
  const chunkSizeMs = chunkSizeMinutes * 60 * 1000;
  const windows: TimeWindow[] = [];

  let currentStart = start;
  while (currentStart < end) {
    const currentEnd = Math.min(currentStart + chunkSizeMs, end);
    windows.push({
      start: currentStart,
      end: currentEnd,
    });
    currentStart = currentEnd;
  }

  return windows;
}

/**
 * Process a single chunk - aggregate spans and index edges
 */
async function processChunk({
  apmEventClient,
  esClient,
  window,
  edgeType,
  chunkIndex,
  logger,
}: {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  window: TimeWindow;
  edgeType: 'exit_span' | 'span_link';
  chunkIndex: number;
  logger: Logger;
}): Promise<ChunkProcessingResult> {
  const { start, end } = window;

  try {
    logger.debug(
      `Chunk ${chunkIndex + 1}: Processing ${new Date(start).toISOString()} - ${new Date(
        end
      ).toISOString()}`
    );

    // Aggregate spans for this time window
    const [exitSpanEdges, spanLinkEdges] =
      edgeType === 'exit_span'
        ? [await aggregateExitSpanEdges({ apmEventClient, start, end, logger }), []]
        : [[], await aggregateSpanLinkEdges({ apmEventClient, start, end, logger })];

    const allEdges = [...exitSpanEdges, ...spanLinkEdges];

    if (allEdges.length === 0) {
      logger.debug(`Chunk ${chunkIndex + 1}: No edges found`);

      // Checkpoint: mark this window as successfully processed
      await markWindowProcessed({
        esClient,
        window: { start, end },
        edgeType,
        edgeCount: 0,
        success: true,
        logger,
      });

      return {
        indexed: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        edgeCount: 0,
        chunkIndex,
        start,
        end,
        success: true,
      };
    }

    logger.debug(`Chunk ${chunkIndex + 1}: Found ${allEdges.length} edges`);

    // Direct bulk upsert - let ES handle existence checking and merging
    const result = await indexEdges({
      esClient,
      edges: allEdges,
      logger,
      endTimestamp: end,
      existingEdgesMap: new Map(), // Empty map = treat all as new (simpler, faster)
    });

    logger.debug(
      `Chunk ${chunkIndex + 1}: Indexed ${result.created} created, ${result.updated} updated, ${
        result.skipped
      } skipped`
    );

    // Checkpoint: mark this window as successfully processed
    await markWindowProcessed({
      esClient,
      window: { start, end },
      edgeType,
      edgeCount: allEdges.length,
      success: true,
      logger,
    });

    return {
      ...result,
      edgeCount: allEdges.length,
      chunkIndex,
      start,
      end,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Chunk ${chunkIndex + 1} failed: ${errorMessage}`, {
      error: error instanceof Error ? error : undefined,
      chunk: { start, end, chunkIndex },
    });

    // Checkpoint: mark this window as failed so we can retry it later
    await markWindowProcessed({
      esClient,
      window: { start, end },
      edgeType,
      edgeCount: 0,
      success: false,
      error: errorMessage,
      logger,
    });

    return {
      indexed: 0,
      updated: 0,
      created: 0,
      skipped: 0,
      edgeCount: 0,
      chunkIndex,
      start,
      end,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Process chunks with controlled concurrency
 * Prevents overwhelming Elasticsearch and event loop
 */
export async function processChunksWithConcurrencyLimit({
  apmEventClient,
  esClient,
  windows,
  edgeType,
  maxConcurrency,
  logger,
}: {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  windows: TimeWindow[];
  edgeType: 'exit_span' | 'span_link';
  maxConcurrency: number;
  logger: Logger;
}): Promise<ChunkProcessingResult[]> {
  const results: ChunkProcessingResult[] = [];
  const errors: Array<{ chunkIndex: number; error: string }> = [];

  logger.info(
    `Processing ${windows.length} windows with concurrency ${maxConcurrency} for ${edgeType}`
  );

  // Process chunks with controlled concurrency
  for (let i = 0; i < windows.length; i += maxConcurrency) {
    const batch = windows.slice(i, i + maxConcurrency);
    const batchPromises = batch.map((window, batchIndex) =>
      processChunk({
        apmEventClient,
        esClient,
        window,
        edgeType,
        chunkIndex: i + batchIndex,
        logger,
      })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Collect errors
    batchResults.forEach((result) => {
      if (!result.success && result.error) {
        errors.push({
          chunkIndex: result.chunkIndex,
          error: result.error,
        });
      }
    });

    // Log progress
    const processed = results.length;
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    logger.info(
      `Progress: ${processed}/${windows.length} chunks processed (${succeeded} succeeded, ${failed} failed)`
    );
  }

  // Log summary
  const totalSucceeded = results.filter((r) => r.success).length;
  const totalFailed = results.filter((r) => !r.success).length;
  logger.info(
    `Completed processing ${results.length} chunks: ${totalSucceeded} succeeded, ${totalFailed} failed`
  );

  if (errors.length > 0) {
    logger.warn(
      `Chunk processing errors:` +
        errors
          .slice(0, 10)
          .map((e) => `Chunk ${e.chunkIndex}: ${e.error}`)
          .join('; ')
    ); // Log first 10 errors
  }

  return results;
}

/**
 * Aggregate results from multiple chunks
 */
export function aggregateChunkResults(results: ChunkProcessingResult[]): {
  indexed: number;
  updated: number;
  created: number;
  skipped: number;
  edgeCount: number;
  chunksProcessed: number;
  chunksSucceeded: number;
  chunksFailed: number;
} {
  return results.reduce(
    (acc, result) => ({
      indexed: acc.indexed + result.indexed,
      updated: acc.updated + result.updated,
      created: acc.created + result.created,
      skipped: acc.skipped + result.skipped,
      edgeCount: acc.edgeCount + result.edgeCount,
      chunksProcessed: acc.chunksProcessed + 1,
      chunksSucceeded: acc.chunksSucceeded + (result.success ? 1 : 0),
      chunksFailed: acc.chunksFailed + (result.success ? 0 : 1),
    }),
    {
      indexed: 0,
      updated: 0,
      created: 0,
      skipped: 0,
      edgeCount: 0,
      chunksProcessed: 0,
      chunksSucceeded: 0,
      chunksFailed: 0,
    }
  );
}
