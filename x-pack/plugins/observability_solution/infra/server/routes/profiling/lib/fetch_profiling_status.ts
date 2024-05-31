/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import type { InfraRequestHandlerContext } from '../../../types';

export async function fetchProfilingStatus(
  profilingDataAccess: ProfilingDataAccessPluginStart,
  coreRequestContext: CoreRequestHandlerContext,
  infraRequestContext: InfraRequestHandlerContext
): Promise<ProfilingStatus> {
  return await profilingDataAccess.services.getStatus({
    esClient: coreRequestContext.elasticsearch.client,
    soClient: coreRequestContext.savedObjects.client,
    spaceId: infraRequestContext.spaceId,
  });
}
