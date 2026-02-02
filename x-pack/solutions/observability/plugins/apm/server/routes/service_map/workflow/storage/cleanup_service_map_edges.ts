/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * 💾 STORAGE
 *
 * Cleanup - removes stale edges and old service discovery documents.
 * Keeps indices size manageable and data fresh.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EDGES_INDEX, SERVICES_INDEX } from '../core/utils';

const EDGE_RETENTION = 'now-24h'; // Maximum edge age based on computed_at
const EDGE_STALE_THRESHOLD = 'now-2h'; // Edges not seen in 2h are considered stale
const SERVICE_RETENTION = 'now-1h'; // Clean services discovered more than 1h ago

export interface CleanupServiceMapEdgesResponse {
  deleted: number;
  staleDeleted: number;
  servicesDeleted: number;
}

export async function cleanupServiceMapEdges({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<CleanupServiceMapEdgesResponse> {
  // Clean up old edges (based on computed_at)
  const edgesResponse = await esClient.deleteByQuery({
    index: EDGES_INDEX,
    query: { range: { computed_at: { lt: EDGE_RETENTION } } },
  });

  // Clean up stale edges (not seen recently, based on last_seen_at)
  const staleEdgesResponse = await esClient.deleteByQuery({
    index: EDGES_INDEX,
    query: {
      bool: {
        must: [{ range: { last_seen_at: { lt: EDGE_STALE_THRESHOLD } } }],
      },
    },
  });

  // Clean up old service discovery documents
  const servicesResponse = await esClient.deleteByQuery({
    index: SERVICES_INDEX,
    query: { range: { discovered_at: { lt: SERVICE_RETENTION } } },
  });

  const deleted = edgesResponse.deleted ?? 0;
  const staleDeleted = staleEdgesResponse.deleted ?? 0;
  const servicesDeleted = servicesResponse.deleted ?? 0;

  logger.debug(
    `Cleaned up ${deleted} old edges, ${staleDeleted} stale edges, and ${servicesDeleted} old service discovery docs`
  );

  return { deleted, staleDeleted, servicesDeleted };
}
