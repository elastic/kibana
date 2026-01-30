/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const EDGES_INDEX = '.apm-service-map-workflow';
const EDGE_RETENTION = 'now-24h';

export interface CleanupServiceMapEdgesResponse {
  deleted: number;
}

export async function cleanupServiceMapEdges({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<CleanupServiceMapEdgesResponse> {
  const response = await esClient.deleteByQuery({
    index: EDGES_INDEX,
    query: {
      range: {
        computed_at: { lt: EDGE_RETENTION },
      },
    },
  });

  logger.debug(`Cleaned up ${response.deleted ?? 0} old edges`);

  return { deleted: response.deleted ?? 0 };
}
