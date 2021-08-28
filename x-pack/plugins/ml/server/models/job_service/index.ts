/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '../../../../../../src/core/server/elasticsearch/client/scoped_cluster_client';
import type { RulesClient } from '../../../../alerting/server';
import type { MlClient } from '../../lib/ml_client/types';
import { datafeedsProvider } from './datafeeds';
import { groupsProvider } from './groups';
import { jobsProvider } from './jobs';
import { modelSnapshotProvider } from './model_snapshots';
import { topCategoriesProvider } from './new_job/categorization/top_categories';
import { newJobChartsProvider } from './new_job/charts';
import { newJobCapsProvider } from './new_job_caps/new_job_caps';

export function jobServiceProvider(
  client: IScopedClusterClient,
  mlClient: MlClient,
  rulesClient?: RulesClient
) {
  return {
    ...datafeedsProvider(client, mlClient),
    ...jobsProvider(client, mlClient, rulesClient),
    ...groupsProvider(mlClient),
    ...newJobCapsProvider(client),
    ...newJobChartsProvider(client),
    ...topCategoriesProvider(mlClient),
    ...modelSnapshotProvider(client, mlClient),
  };
}
