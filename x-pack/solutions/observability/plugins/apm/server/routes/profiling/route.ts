/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  routeDefinitions,
  type ServicesFlamegraphResponse,
  type ServicesFunctionsResponse,
  type ProfilingStatusResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { fetchFlamegraph } from './fetch_flamegraph';
import { fetchFunctions } from './fetch_functions';
import { getStacktracesIdsField } from './get_stacktraces_ids_field';

const servicesFlamegraphRoute = createApmServerRoute({
  endpoint: routeDefinitions.profiling.flamegraph.endpoint,
  params: routeDefinitions.profiling.flamegraph.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServicesFlamegraphResponse | undefined> => {
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
      const stacktraceIdsField = await getStacktracesIdsField({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        transactionType,
        transactionName,
        kuery,
      });

      return fetchFlamegraph({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        start: start / 1000,
        end: end / 1000,
        kuery,
        serviceName,
        transactionName,
        environment,
        transactionType,
        indices,
        stacktraceIdsField,
      });
    }

    return undefined;
  },
});

const servicesFunctionsRoute = createApmServerRoute({
  endpoint: routeDefinitions.profiling.functions.endpoint,
  params: routeDefinitions.profiling.functions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServicesFunctionsResponse | undefined> => {
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
      const stacktraceIdsField = await getStacktracesIdsField({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        transactionType,
        transactionName,
        kuery,
      });

      return fetchFunctions({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        startIndex,
        endIndex,
        indices,
        stacktraceIdsField,
        start: start / 1000,
        end: end / 1000,
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
  endpoint: routeDefinitions.profiling.status.endpoint,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ProfilingStatusResponse> => {
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
