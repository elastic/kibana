/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'kibana/server';
import { LegacyAPICaller } from 'src/core/server';

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

async function callMigrationApi(callCluster: LegacyAPICaller) {
  return await callCluster('monitoring.disableWatches');
}

export async function disableWatcherClusterAlerts(callCluster: LegacyAPICaller, logger: Logger) {
  const response: DisableWatchesResponse = await callMigrationApi(callCluster);
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
