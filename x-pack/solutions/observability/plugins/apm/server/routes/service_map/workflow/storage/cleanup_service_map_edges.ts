/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unified cleanup for all service map workflow indices.
 *
 * Runs as a single step in the workflow, cleaning:
 *   - Stale edges (not seen in 24h)
 *   - Stale services (not seen in 24h)
 *   - Old graph snapshots (older than 24h)
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EDGES_INDEX, SERVICES_INDEX } from '../core/utils';
import { GRAPH_INDEX } from '../graph/utils';

/** Retention window for all indices */
const RETENTION = 'now-24h';

export interface CleanupServiceMapEdgesResponse {
  edgesDeleted: number;
  servicesDeleted: number;
  graphSnapshotsDeleted: number;
}

export async function cleanupServiceMapEdges({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<CleanupServiceMapEdgesResponse> {
  // Clean up stale edges (not seen in 24h)
  const edgesResponse = await esClient.deleteByQuery({
    index: EDGES_INDEX,
    query: { range: { last_seen_at: { lt: RETENTION } } },
  });

  // Clean up stale services (not seen in 24h)
  const servicesResponse = await esClient.deleteByQuery({
    index: SERVICES_INDEX,
    query: { range: { last_seen_at: { lt: RETENTION } } },
  });

  // Clean up old graph snapshots (older than 24h)
  let graphSnapshotsDeleted = 0;
  try {
    const graphResponse = await esClient.deleteByQuery({
      index: GRAPH_INDEX,
      query: { range: { computed_at: { lt: RETENTION } } },
    });
    graphSnapshotsDeleted = graphResponse.deleted ?? 0;
  } catch (e: unknown) {
    logger.warn('Failed to clean up graph snapshots (index may not exist yet)');
  }

  const edgesDeleted = edgesResponse.deleted ?? 0;
  const servicesDeleted = servicesResponse.deleted ?? 0;

  logger.debug(
    `Cleanup: ${edgesDeleted} stale edges, ${servicesDeleted} stale services, ${graphSnapshotsDeleted} old graph snapshots`
  );

  return { edgesDeleted, servicesDeleted, graphSnapshotsDeleted };
}
