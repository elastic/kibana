/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import {
  InfraProfilingFlamegraphRequestParamsRT,
  InfraProfilingFunctionsRequestParamsRT,
} from '../../../common/http_api/profiling_api';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { fetchProfilingFlamegraph } from './lib/fetch_profiling_flamegraph';
import { fetchProfilingFunctions } from './lib/fetch_profiling_functions';
import { fetchProfilingStatus } from './lib/fetch_profiling_status';
import { getProfilingDataAccess } from './lib/get_profiling_data_access';

const CACHE_CONTROL_HEADER_VALUE = 'private, max-age=3600';

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
      method: 'get',
      path: '/api/infra/profiling/flamegraph',
      validate: {
        query: schema.object({
          hostname: schema.string(),
          from: schema.number(),
          to: schema.number(),
        }),
      },
    },
    async (requestContext, request, response) => {
      const params = decodeOrThrow(InfraProfilingFlamegraphRequestParamsRT)(request.query);

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
        headers: {
          'cache-control': CACHE_CONTROL_HEADER_VALUE,
        },
      });
    }
  );

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/infra/profiling/functions',
      validate: {
        query: schema.object({
          hostname: schema.string(),
          from: schema.number(),
          to: schema.number(),
          startIndex: schema.number(),
          endIndex: schema.number(),
        }),
      },
    },
    async (requestContext, request, response) => {
      const params = decodeOrThrow(InfraProfilingFunctionsRequestParamsRT)(request.query);

      const [coreRequestContext, profilingDataAccess] = await Promise.all([
        requestContext.core,
        getProfilingDataAccess(getStartServices),
      ]);

      const functions = await fetchProfilingFunctions(
        params,
        profilingDataAccess,
        coreRequestContext
      );

      return response.ok({
        body: functions,
        headers: {
          'cache-control': CACHE_CONTROL_HEADER_VALUE,
        },
      });
    }
  );
}
