/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'src/core/server';

async function callMigrationApi(callCluster: LegacyAPICaller) {
  // return await callCluster('_monitoring/migrate/alerts');
  return {
    exporters: [
      {
        name: 'thename',
        type: 'http',
        migration_complete: true,
        reason: 'optional - exception',
      },
      {
        name: 'thename2',
        type: 'local',
        migration_complete: false,
        reason: 'optional - exception',
      },
    ],
  };
}

export async function disableWatcherClusterAlerts(callCluster: LegacyAPICaller) {
  const response = await callMigrationApi(callCluster);
  if (!response || response.exporters.length === 0) {
    return true;
  }
  if (response.exporters.every((exp) => exp.migration_complete)) {
    return true;
  }
  return false;
}
