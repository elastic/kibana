/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import {
  routeDefinitions,
  type ProfilingHostsFlamegraphResponse,
  type ProfilingHostsFunctionsResponse,
  type ProfilingHostsSchemasResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { fetchFlamegraph } from '../fetch_flamegraph';
import { fetchFunctions } from '../fetch_functions';
import { getProfilingHostsSchemas } from '../get_profiling_schemas';
import { getServiceCorrelationFields } from '../get_service_correlation_fields';
import { getHostsProfilingEventsQuery } from '../profiling_queries';
import { toProfilingTimeRange } from '../utils';

const profilingHostsFlamegraphRoute = createApmServerRoute({
  endpoint: routeDefinitions.profiling.hostsFlamegraph.endpoint,
  params: routeDefinitions.profiling.hostsFlamegraph.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ProfilingHostsFlamegraphResponse | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, apmEventClient, profilingDataAccessStart] = await Promise.all([
      core.elasticsearch.client,
      getApmEventClient(resources),
      plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      const { start, end, environment, documentType, rollupInterval, kuery, schema } = params.query;
      const { serviceName } = params.path;

      const { hostNames, containerIds } = await getServiceCorrelationFields({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      if (!hostNames.length && !containerIds.length) {
        return undefined;
      }
      const { startSeconds, endSeconds, totalSeconds } = toProfilingTimeRange({ start, end });

      const flamegraph = await fetchFlamegraph({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        totalSeconds,
        query: getHostsProfilingEventsQuery({
          start: startSeconds,
          end: endSeconds,
          kuery,
          hostNames,
          containerIds,
        }),
        schema,
        abortSignal: getRequestAbortedSignal(resources.request.events.aborted$),
      });

      return { flamegraph, hostNames, containerIds };
    }

    return undefined;
  },
});

const profilingHostsFunctionsRoute = createApmServerRoute({
  endpoint: routeDefinitions.profiling.hostsFunctions.endpoint,
  params: routeDefinitions.profiling.hostsFunctions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ProfilingHostsFunctionsResponse | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, apmEventClient, profilingDataAccessStart] = await Promise.all([
      core.elasticsearch.client,
      getApmEventClient(resources),
      plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      const {
        start,
        end,
        environment,
        startIndex,
        endIndex,
        documentType,
        rollupInterval,
        kuery,
        schema,
      } = params.query;
      const { serviceName } = params.path;

      const { hostNames, containerIds } = await getServiceCorrelationFields({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      if (!hostNames.length && !containerIds.length) {
        return undefined;
      }

      const { startSeconds, endSeconds, totalSeconds } = toProfilingTimeRange({ start, end });

      const functions = await fetchFunctions({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        startIndex,
        endIndex,
        totalSeconds,
        query: getHostsProfilingEventsQuery({
          start: startSeconds,
          end: endSeconds,
          kuery,
          hostNames,
          containerIds,
        }),
        schema,
        abortSignal: getRequestAbortedSignal(resources.request.events.aborted$),
      });

      return { functions, hostNames, containerIds };
    }

    return undefined;
  },
});

const profilingHostsSchemasRoute = createApmServerRoute({
  endpoint: routeDefinitions.profiling.hostsSchemas.endpoint,
  params: routeDefinitions.profiling.hostsSchemas.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ProfilingHostsSchemasResponse> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, apmEventClient, profilingDataAccessStart] = await Promise.all([
      core.elasticsearch.client,
      getApmEventClient(resources),
      plugins.profilingDataAccess?.start(),
    ]);

    if (!profilingDataAccessStart) {
      return { schemas: [] };
    }

    const { start, end, environment, documentType, rollupInterval, kuery } = params.query;
    const { startSeconds, endSeconds } = toProfilingTimeRange({ start, end });
    const { serviceName } = params.path;

    const { hostNames, containerIds } = await getServiceCorrelationFields({
      apmEventClient,
      start,
      end,
      environment,
      serviceName,
      documentType,
      rollupInterval,
    });

    return getProfilingHostsSchemas({
      profilingDataAccessStart,
      esClient: esClient.asCurrentUser,
      start: startSeconds,
      end: endSeconds,
      hostNames,
      containerIds,
      kuery,
      abortSignal: getRequestAbortedSignal(resources.request.events.aborted$),
    });
  },
});

export const profilingHostsRouteRepository = {
  ...profilingHostsFlamegraphRoute,
  ...profilingHostsFunctionsRoute,
  ...profilingHostsSchemasRoute,
};
