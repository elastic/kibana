/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getLastProcessedTimestamp, updateLastProcessedTimestamp } from '../storage/metadata';
export { indexEdges } from '../storage/indexing';
export {
  calculateTimeWindows,
  processChunksWithConcurrencyLimit,
  aggregateChunkResults,
  filterUnprocessedWindows,
} from './chunk_processing';
export {
  buildDocId,
  normalizeEmptyToNull,
  SERVICES_INDEX,
  EDGES_INDEX,
  METADATA_DOC_ID,
  RESOLUTION_BATCH_SIZE,
  MAX_TERMS_PER_QUERY,
  MAX_CONCURRENT_BATCHES,
} from './utils';
export type { ServiceMapEdge } from './types';
