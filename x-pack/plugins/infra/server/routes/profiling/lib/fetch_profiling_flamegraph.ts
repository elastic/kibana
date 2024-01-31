/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import type { InfraProfilingFlamegraphRequestParams } from '../../../../common/http_api/profiling_api';

export async function fetchProfilingFlamegraph(
  { kuery, from, to }: InfraProfilingFlamegraphRequestParams,
  profilingDataAccess: ProfilingDataAccessPluginStart,
  coreRequestContext: CoreRequestHandlerContext
): Promise<BaseFlameGraph> {
  return await profilingDataAccess.services.fetchFlamechartData({
    core: coreRequestContext,
    esClient: coreRequestContext.elasticsearch.client.asCurrentUser,
    rangeFromMs: from,
    rangeToMs: to,
    kuery,
  });
}
