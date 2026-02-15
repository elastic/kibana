/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * 🛠️ UTILITIES
 *
 * Fast edge existence validation - checks which edges already exist
 * without fetching full documents (uses _source: false).
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EDGES_INDEX } from './utils';

export async function quickExistenceCheck({
  esClient,
  docIds,
  logger,
}: {
  esClient: ElasticsearchClient;
  docIds: string[];
  logger: Logger;
}): Promise<string[]> {
  if (docIds.length === 0) return [];

  const response = await esClient.search({
    index: EDGES_INDEX,
    size: docIds.length,
    _source: false,
    query: { ids: { values: docIds } },
  });

  return response.hits.hits.map((hit) => hit._id!).filter(Boolean);
}
