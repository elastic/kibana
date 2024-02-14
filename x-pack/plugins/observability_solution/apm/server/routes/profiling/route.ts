/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochSecsRt, toNumberRt } from '@kbn/io-ts-utils';
import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { kueryRt } from '../default_api_types';
import { fetchFlamegraph } from './fetch_flamegraph';
import { fetchFunctions } from './fetch_functions';

const profilingFlamegraphRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      kueryRt,
      t.type({
        start: isoToEpochSecsRt,
        end: isoToEpochSecsRt,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<BaseFlameGraph | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, profilingDataAccessStart] = await Promise.all([
      core.elasticsearch.client,
      await plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      const { start, end, kuery } = params.query;
      const { serviceName } = params.path;

      return fetchFlamegraph({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        start,
        end,
        kuery,
        serviceName,
      });
    }

    return undefined;
  },
});

const profilingFunctionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/functions',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.type({
        startIndex: toNumberRt,
        endIndex: toNumberRt,
        start: isoToEpochSecsRt,
        end: isoToEpochSecsRt,
      }),
      kueryRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<TopNFunctions | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, profilingDataAccessStart] = await Promise.all([
      core.elasticsearch.client,
      await plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      const { start, end, startIndex, endIndex, kuery } = params.query;
      const { serviceName } = params.path;

      return fetchFunctions({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        startIndex,
        endIndex,
        start,
        end,
        kuery,
        serviceName,
      });
    }

    return undefined;
  },
});

const profilingStatusRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/profiling/status',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ initialized: boolean }> => {
    const { context, plugins, logger } = resources;
    const [esClient, profilingDataAccessStart] = await Promise.all([
      (await context.core).elasticsearch.client,
      await plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      try {
        const response = await profilingDataAccessStart?.services.getStatus({
          esClient,
          soClient: (await context.core).savedObjects.client,
          spaceId: (
            await plugins.spaces?.start()
          )?.spacesService.getSpaceId(resources.request),
        });

        return { initialized: response.has_setup };
      } catch (e) {
        // If any error happens just return as if profiling has not been initialized
        logger.warn('Could not check Universal Profiling status');
      }
    }

    return { initialized: false };
  },
});

export const profilingRouteRepository = {
  ...profilingFlamegraphRoute,
  ...profilingStatusRoute,
  ...profilingFunctionsRoute,
};
