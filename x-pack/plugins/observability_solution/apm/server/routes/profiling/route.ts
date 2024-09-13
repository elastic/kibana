/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochSecsRt, toNumberRt } from '@kbn/io-ts-utils';
import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import * as t from 'io-ts';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt } from '../default_api_types';
import { fetchFlamegraph } from './fetch_flamegraph';
import { fetchFunctions } from './fetch_functions';
import { TRANSACTION_PROFILER_STACK_TRACE_IDS } from '../../../common/es_fields/apm';

const servicesFlamegraphRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      kueryRt,
      environmentRt,
      t.partial({
        transactionName: t.string,
      }),
      t.type({
        start: isoToEpochSecsRt,
        end: isoToEpochSecsRt,
        transactionType: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<BaseFlameGraph | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, profilingDataAccessStart, apmEventClient] = await Promise.all([
      core.elasticsearch.client,
      await plugins.profilingDataAccess?.start(),
      getApmEventClient(resources),
    ]);
    if (profilingDataAccessStart) {
      const { serviceName } = params.path;
      const { start, end, kuery, transactionName, transactionType, environment } = params.query;

      const indices = apmEventClient.getIndicesFromProcessorEvent(ProcessorEvent.transaction);

      return fetchFlamegraph({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        start,
        end,
        kuery,
        serviceName,
        transactionName,
        environment,
        transactionType,
        indices,
        stacktraceIdsField: TRANSACTION_PROFILER_STACK_TRACE_IDS,
      });
    }

    return undefined;
  },
});

const servicesFunctionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/functions',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      t.partial({
        transactionName: t.string,
      }),
      t.type({
        start: isoToEpochSecsRt,
        end: isoToEpochSecsRt,
        startIndex: toNumberRt,
        endIndex: toNumberRt,
        transactionType: t.string,
      }),
      kueryRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<TopNFunctions | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;

    const [esClient, profilingDataAccessStart, apmEventClient] = await Promise.all([
      core.elasticsearch.client,
      await plugins.profilingDataAccess?.start(),
      getApmEventClient(resources),
    ]);
    if (profilingDataAccessStart) {
      const {
        start,
        end,
        startIndex,
        endIndex,
        kuery,
        transactionName,
        transactionType,
        environment,
      } = params.query;
      const { serviceName } = params.path;

      const indices = apmEventClient.getIndicesFromProcessorEvent(ProcessorEvent.transaction);

      return fetchFunctions({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        startIndex,
        endIndex,
        indices,
        stacktraceIdsField: TRANSACTION_PROFILER_STACK_TRACE_IDS,
        start,
        end,
        kuery,
        serviceName,
        transactionName,
        environment,
        transactionType,
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
          spaceId: (await plugins.spaces?.start())?.spacesService.getSpaceId(resources.request),
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
  ...servicesFlamegraphRoute,
  ...profilingStatusRoute,
  ...servicesFunctionsRoute,
};
