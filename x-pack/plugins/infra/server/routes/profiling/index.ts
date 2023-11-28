/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { InfraProfilingRequestParamsRT } from '../../../common/http_api/profiling_api';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { fetchProfilingFlamegraph } from './lib/fetch_profiling_flamechart';
import { fetchProfilingStatus } from './lib/fetch_profiling_status';
import { getProfilingDataAccess } from './lib/get_profiling_data_access';

export function initProfilingRoutes({ framework, getStartServices, logger }: InfraBackendLibs) {
  if (!Object.hasOwn(framework.plugins, 'profilingDataAccess')) {
    logger.info(
      "Skipping initialization of Profiling endpoints because 'profilingDataAccess' plugin is not available"
    );
    return;
  }

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/infra/profiling/status',
      validate: false,
    },
    async (requestContext, request, response) => {
      const [coreRequestContext, infraRequestContext, profilingDataAccess] = await Promise.all([
        requestContext.core,
        requestContext.infra,
        getProfilingDataAccess(getStartServices),
      ]);

      const profilingStatus = await fetchProfilingStatus(
        profilingDataAccess,
        coreRequestContext,
        infraRequestContext
      );

      return response.ok({
        body: profilingStatus,
      });
    }
  );

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/profiling/flamegraph',
      validate: {
        /**
         * Allow any body object and validate it inside
         * the handler using RT.
         */
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (requestContext, request, response) => {
      const params = decodeOrThrow(InfraProfilingRequestParamsRT)(request.body);

      const [coreRequestContext, profilingDataAccess] = await Promise.all([
        requestContext.core,
        getProfilingDataAccess(getStartServices),
      ]);

      const flamegraph = await fetchProfilingFlamegraph(
        params,
        profilingDataAccess,
        coreRequestContext
      );

      return response.ok({
        body: flamegraph,
      });
    }
  );
}
