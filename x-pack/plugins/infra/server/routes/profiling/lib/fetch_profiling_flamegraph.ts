/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import { profilingUseLegacyFlamegraphAPI } from '@kbn/observability-plugin/common';
import type { InfraProfilingFlamegraphRequestParams } from '../../../../common/http_api/profiling_api';
import { HOST_FIELD } from '../../../../common/constants';

export async function fetchProfilingFlamegraph(
  { hostname, from, to }: InfraProfilingFlamegraphRequestParams,
  profilingDataAccess: ProfilingDataAccessPluginStart,
  coreRequestContext: CoreRequestHandlerContext
): Promise<BaseFlameGraph> {
  const useLegacyFlamegraphAPI = await coreRequestContext.uiSettings.client.get<boolean>(
    profilingUseLegacyFlamegraphAPI
  );

  return await profilingDataAccess.services.fetchFlamechartData({
    esClient: coreRequestContext.elasticsearch.client.asCurrentUser,
    rangeFromMs: from,
    rangeToMs: to,
    kuery: `${HOST_FIELD} : "${hostname}"`,
    useLegacyFlamegraphAPI,
  });
}
