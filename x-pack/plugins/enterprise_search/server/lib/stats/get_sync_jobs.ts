/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX } from '@kbn/search-connectors';

import { SyncJobsStats } from '../../../common/stats';

import {
  getConnectedCountQuery,
  getErrorCountQuery,
  getIdleJobsCountQuery,
  getIncompleteCountQuery,
  getInProgressJobsCountQuery,
  getOrphanedJobsCountQuery,
} from '../../utils/get_sync_jobs_queries';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export const fetchSyncJobsStats = async (
  client: IScopedClusterClient,
  isCrawler?: boolean
): Promise<SyncJobsStats> => {
  try {
    const connectorIdsResult = await client.asCurrentUser.search({
      index: CONNECTORS_INDEX,
      scroll: '10s',
      stored_fields: [],
    });
    const ids = connectorIdsResult.hits.hits.map((hit) => hit._id!);
    const orphanedJobsCountResponse = await client.asCurrentUser.count({
      index: CONNECTORS_JOBS_INDEX,
      query: getOrphanedJobsCountQuery(ids, isCrawler),
    });

    const inProgressJobsCountResponse = await client.asCurrentUser.count({
      index: CONNECTORS_JOBS_INDEX,
      query: getInProgressJobsCountQuery(isCrawler),
    });

    // Idle syncs don't make sense for Crawler, because it does not have concept of "Idle" syncs at all.
    // We tried tracking idle syncs in a way similar to connectors, but it results in all crawler jobs
    // marked as idle.
    const idleJobsCountResponse = isCrawler
      ? undefined
      : await client.asCurrentUser.count({
          index: CONNECTORS_JOBS_INDEX,
          query: getIdleJobsCountQuery(),
        });

    const errorResponse = await client.asCurrentUser.count({
      index: CONNECTORS_INDEX,
      query: getErrorCountQuery(isCrawler),
    });

    const connectedResponse = await client.asCurrentUser.count({
      index: CONNECTORS_INDEX,
      query: getConnectedCountQuery(isCrawler),
    });

    const incompleteResponse = await client.asCurrentUser.count({
      index: CONNECTORS_INDEX,
      query: getIncompleteCountQuery(isCrawler),
    });

    const response = {
      connected: connectedResponse.count,
      errors: errorResponse.count,
      idle: idleJobsCountResponse?.count || 0,
      in_progress: inProgressJobsCountResponse.count,
      incomplete: incompleteResponse.count,
      orphaned_jobs: orphanedJobsCountResponse.count,
    };

    return response;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return {
        connected: 0,
        errors: 0,
        idle: 0,
        in_progress: 0,
        incomplete: 0,
        orphaned_jobs: 0,
      };
    }
    throw error;
  }
};
