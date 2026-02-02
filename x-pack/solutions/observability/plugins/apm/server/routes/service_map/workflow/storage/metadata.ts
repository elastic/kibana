/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * 💾 STORAGE
 *
 * Workflow metadata tracking.
 *
 * Stores and retrieves workflow state:
 * - Last processed timestamp (for incremental processing)
 * - Min/max span timestamps (for optimization)
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EDGES_INDEX, METADATA_DOC_ID } from '../core/utils';

interface WorkflowMetadata {
  last_processed_timestamp: number;
  updated_at: string;
}

export async function getLastProcessedTimestamp({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<number | null> {
  try {
    const { _source } = await esClient.get<WorkflowMetadata>({
      index: EDGES_INDEX,
      id: METADATA_DOC_ID,
    });

    const timestamp = _source?.last_processed_timestamp;
    if (timestamp) {
      logger.debug(`Last processed timestamp: ${new Date(timestamp).toISOString()}`);
      return timestamp;
    }
  } catch (error: any) {
    if (error.statusCode !== 404) {
      logger.warn(`Failed to retrieve workflow metadata: ${error.message}`);
    }
  }
  return null;
}

export async function updateLastProcessedTimestamp({
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
      refresh: false,
    });
    logger.debug(`Updated last processed timestamp: ${new Date(timestamp).toISOString()}`);
  } catch (error: any) {
    logger.warn(`Failed to update workflow metadata: ${error.message}`);
  }
}

export async function getMinMaxSpanTimestamp({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<number | null> {
  try {
    const response = await esClient.search<
      unknown,
      { min_max_span_timestamp: { value: number | null } }
    >({
      index: EDGES_INDEX,
      size: 0,
      query: { bool: { must_not: { term: { _id: METADATA_DOC_ID } } } },
      aggs: { min_max_span_timestamp: { min: { field: 'max_span_timestamp' } } },
    });

    const minValue = response.aggregations?.min_max_span_timestamp?.value;
    if (minValue != null) {
      logger.debug(`Min max_span_timestamp: ${new Date(minValue).toISOString()}`);
      return minValue;
    }
  } catch (error: any) {
    if (error.statusCode !== 404) {
      logger.warn(`Failed to get min max_span_timestamp: ${error.message}`);
    }
  }
  return null;
}
