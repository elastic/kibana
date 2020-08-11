/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { datafeedsProvider } from './datafeeds';
import { jobsProvider } from './jobs';
import { groupsProvider } from './groups';
import { newJobCapsProvider } from './new_job_caps';
import { newJobChartsProvider, topCategoriesProvider } from './new_job';
import { modelSnapshotProvider } from './model_snapshots';

export function jobServiceProvider(mlClusterClient: ILegacyScopedClusterClient) {
  return {
    ...datafeedsProvider(mlClusterClient),
    ...jobsProvider(mlClusterClient),
    ...groupsProvider(mlClusterClient),
    ...newJobCapsProvider(mlClusterClient),
    ...newJobChartsProvider(mlClusterClient),
    ...topCategoriesProvider(mlClusterClient),
    ...modelSnapshotProvider(mlClusterClient),
  };
}
