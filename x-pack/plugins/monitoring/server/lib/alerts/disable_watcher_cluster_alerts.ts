/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core/server';

interface DisableWatchesResponse {
  exporters: Array<
    Array<{
      name: string;
      type: string;
      migration_complete: boolean;
      reason?: {
        type: string;
        reason: string;
      };
    }>
  >;
}

async function callMigrationApi(callCluster: ElasticsearchClient, logger: Logger) {
  try {
    const response = await callCluster.transport.request({
      method: 'post',
      path: '/monitoring.disableWatches',
    });
    return response as DisableWatchesResponse;
  } catch (err) {
    logger.warn(
      `Unable to call migration api to disable cluster alert watches. Message=${err.message}`
    );
    return undefined;
  }
}

export async function disableWatcherClusterAlerts(
  callCluster: ElasticsearchClient,
  logger: Logger
) {
  const response: DisableWatchesResponse | undefined = await callMigrationApi(callCluster, logger);
  if (!response || response.exporters.length === 0) {
    return true;
  }
  const list = response.exporters[0];
  if (list.length === 0) {
    return true;
  }

  let removedAll = true;
  for (const exporter of list) {
    if (!exporter.migration_complete) {
      if (exporter.reason) {
        logger.warn(
          `Unable to remove exporter type=${exporter.type} and name=${exporter.name} because ${exporter.reason.type}: ${exporter.reason.reason}`
        );
        removedAll = false;
      }
    }
  }
  return removedAll;
}
