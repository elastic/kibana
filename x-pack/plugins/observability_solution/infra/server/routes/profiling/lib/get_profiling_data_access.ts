/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { InfraPluginStartServicesAccessor } from '../../../types';

export async function getProfilingDataAccess(
  getStartServices: InfraPluginStartServicesAccessor
): Promise<ProfilingDataAccessPluginStart> {
  const [, { profilingDataAccess }] = await getStartServices();

  if (profilingDataAccess === undefined) {
    throw new Error(
      "Trying to access profilingDataAccess plugin but it's not in the start dependencies"
    );
  }

  return profilingDataAccess;
}
