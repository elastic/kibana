/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { datafeedsProvider } from './datafeeds';
import { jobsProvider } from './jobs';
import { groupsProvider } from './groups';
import { newJobCapsProvider } from './new_job_caps';
import { newJobChartsProvider, topCategoriesProvider } from './new_job';
import { modelSnapshotProvider } from './model_snapshots';
import type { MlClient } from '../../lib/ml_client';

export function jobServiceProvider(client: IScopedClusterClient, mlClient: MlClient) {
  return {
    ...datafeedsProvider(mlClient),
    ...jobsProvider(client, mlClient),
    ...groupsProvider(mlClient),
    ...newJobCapsProvider(client),
    ...newJobChartsProvider(client),
    ...topCategoriesProvider(mlClient),
    ...modelSnapshotProvider(mlClient),
  };
}
