/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import { hasUsableProfilingData } from '@kbn/profiling-utils';

interface Params {
  profilingDataAccessStart: ProfilingDataAccessPluginStart;
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  spaceId?: string;
  abortSignal?: AbortSignal;
}

/** Whether there is profiling data to show in either profiling schema. */
export async function getProfilingInitialized({
  profilingDataAccessStart,
  ...statusParams
}: Params): Promise<boolean> {
  const status = await profilingDataAccessStart.services.getStatus(statusParams);
  return hasUsableProfilingData(status);
}
