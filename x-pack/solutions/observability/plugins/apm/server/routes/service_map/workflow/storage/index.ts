/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getExistingEdges, indexEdges } from './indexing';
export {
  getLastProcessedTimestamp,
  updateLastProcessedTimestamp,
  getMinMaxSpanTimestamp,
} from './metadata';
export {
  cleanupServiceMapEdges,
  type CleanupServiceMapEdgesResponse,
} from './cleanup_service_map_edges';
