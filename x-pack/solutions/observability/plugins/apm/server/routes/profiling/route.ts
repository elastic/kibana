/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  routeDefinitions,
  type ServicesFlamegraphResponse,
  type ServicesFunctionsResponse,
  type ProfilingStatusResponse,
  type ServicesProfilingSchemasResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { fetchFlamegraph } from './fetch_flamegraph';
import { fetchFunctions } from './fetch_functions';
import { getProfilingInitialized } from './get_profiling_initialized';
import { getProfilingSchemas } from './get_profiling_schemas';
import { getStacktracesIdsField } from './get_stacktraces_ids_field';
import { getTransactionsProfilingQuery } from './profiling_queries';
import { toProfilingTimeRange } from './utils';

const servicesFlamegraphRoute = createApmServerRoute({
  endpoint: routeDefinitions.profiling.flamegraph.endpoint,
  params: routeDefinitions.profiling.flamegraph.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServicesFlamegraphResponse | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, profilingDataAccessStart, apmEventClient] = await Promise.all([
      core.elasticsearch.client,
      plugins.profilingDataAccess?.start(),
      getApmEventClient(resources),
    ]);
    if (profilingDataAccessStart) {
      const { serviceName } = params.path;
      const { start, end, kuery, transactionName, transactionType, environment, schema } =
        params.query;
      const { startSeconds, endSeconds, totalSeconds } = toProfilingTimeRange({ start, end });

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
        totalSeconds,
        query: getTransactionsProfilingQuery({
          start: startSeconds,
          end: endSeconds,
          kuery,
          serviceName,
          transactionName,
          environment,
          transactionType,
        }),
        indices,
        stacktraceIdsField,
        schema,
        abortSignal: getRequestAbortedSignal(resources.request.events.aborted$),
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
      plugins.profilingDataAccess?.start(),
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
        schema,
      } = params.query;
      const { startSeconds, endSeconds, totalSeconds } = toProfilingTimeRange({ start, end });
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
        totalSeconds,
        query: getTransactionsProfilingQuery({
          start: startSeconds,
          end: endSeconds,
          kuery,
          serviceName,
          transactionName,
          environment,
          transactionType,
        }),
        indices,
        stacktraceIdsField,
        schema,
        abortSignal: getRequestAbortedSignal(resources.request.events.aborted$),
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
    const [core, profilingDataAccessStart] = await Promise.all([
      context.core,
      plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      const abortSignal = getRequestAbortedSignal(resources.request.events.aborted$);
      try {
        const initialized = await getProfilingInitialized({
          profilingDataAccessStart,
          esClient: core.elasticsearch.client,
          soClient: core.savedObjects.client,
          spaceId: resources.request.spaceId,
          abortSignal,
        });

        return { initialized };
      } catch (e) {
        // If any error happens just return as if profiling has not been initialized. An aborted
        // request is no error: nobody gets its response.
        if (!abortSignal.aborted) {
          logger.warn('Could not check the profiling status');
        }
      }
    }

    return { initialized: false };
  },
});

const servicesProfilingSchemasRoute = createApmServerRoute({
  endpoint: routeDefinitions.profiling.schemas.endpoint,
  params: routeDefinitions.profiling.schemas.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServicesProfilingSchemasResponse> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, profilingDataAccessStart, apmEventClient] = await Promise.all([
      core.elasticsearch.client,
      plugins.profilingDataAccess?.start(),
      getApmEventClient(resources),
    ]);

    if (!profilingDataAccessStart) {
      return { schemas: [] };
    }

    const { serviceName } = params.path;
    const { start, end, kuery, transactionName, transactionType, environment } = params.query;
    const { startSeconds, endSeconds } = toProfilingTimeRange({ start, end });

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

    return getProfilingSchemas({
      profilingDataAccessStart,
      esClient: esClient.asCurrentUser,
      start: startSeconds,
      end: endSeconds,
      kuery,
      serviceName,
      transactionName,
      environment,
      transactionType,
      indices,
      stacktraceIdsField,
      abortSignal: getRequestAbortedSignal(resources.request.events.aborted$),
    });
  },
});

export const profilingRouteRepository = {
  ...servicesFlamegraphRoute,
  ...profilingStatusRoute,
  ...servicesFunctionsRoute,
  ...servicesProfilingSchemasRoute,
};
