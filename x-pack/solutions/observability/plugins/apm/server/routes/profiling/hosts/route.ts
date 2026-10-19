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
import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import {
  getProfilingScopeCandidates,
  type ProfilingScopeCandidate,
} from '../../../../common/profiling/hosts_scope';
import { mergeKueries } from '../../../../common/utils/kuery_utils';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { fetchFlamegraph } from '../fetch_flamegraph';
import { fetchFunctions } from '../fetch_functions';
import { getProfilingHostsSchemas } from '../get_profiling_schemas';
import { getServiceCorrelationFields } from '../get_service_correlation_fields';
import { getProfilingEventsQueryFromKuery } from '../profiling_queries';
import { toProfilingTimeRange } from '../utils';

/**
 * Runs `fetch` for each candidate scope, most specific first, and returns the first result that
 * contains samples. The least specific scope is returned as-is when nothing matches, so the
 * response still tells the UI which keys were tried.
 */
async function fetchFirstScopeWithSamples<T>({
  candidates,
  kuery,
  fetch,
  hasSamples,
}: {
  candidates: ProfilingScopeCandidate[];
  kuery: string;
  fetch: (scopedKuery: string) => Promise<T>;
  hasSamples: (result: T) => boolean;
}): Promise<{ candidate: ProfilingScopeCandidate; result: T } | undefined> {
  let last: { candidate: ProfilingScopeCandidate; result: T } | undefined;

  for (const candidate of candidates) {
    const result = await fetch(mergeKueries([candidate.kuery, kuery]));
    last = { candidate, result };
    if (hasSamples(result)) {
      return last;
    }
  }

  return last;
}

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

      const correlation = await getServiceCorrelationFields({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      const candidates = getProfilingScopeCandidates(correlation);
      if (candidates.length === 0) {
        return undefined;
      }
      const { startSeconds, endSeconds, totalSeconds } = toProfilingTimeRange({ start, end });

      const match = await fetchFirstScopeWithSamples({
        candidates,
        kuery,
        fetch: (scopedKuery: string): Promise<BaseFlameGraph> =>
          fetchFlamegraph({
            profilingDataAccessStart,
            core,
            esClient: esClient.asCurrentUser,
            totalSeconds,
            query: getProfilingEventsQueryFromKuery({
              start: startSeconds,
              end: endSeconds,
              kuery: scopedKuery,
            }),
            schema,
            abortSignal: getRequestAbortedSignal(resources.request.events.aborted$),
          }),
        hasSamples: (flamegraph: BaseFlameGraph): boolean => flamegraph.TotalSamples > 0,
      });
      if (!match) {
        return undefined;
      }

      return { flamegraph: match.result, scope: match.candidate.scope, ...correlation };
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

      const correlation = await getServiceCorrelationFields({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      const candidates = getProfilingScopeCandidates(correlation);
      if (candidates.length === 0) {
        return undefined;
      }

      const { startSeconds, endSeconds, totalSeconds } = toProfilingTimeRange({ start, end });

      const match = await fetchFirstScopeWithSamples({
        candidates,
        kuery,
        fetch: (scopedKuery: string): Promise<TopNFunctions> =>
          fetchFunctions({
            profilingDataAccessStart,
            core,
            esClient: esClient.asCurrentUser,
            startIndex,
            endIndex,
            totalSeconds,
            query: getProfilingEventsQueryFromKuery({
              start: startSeconds,
              end: endSeconds,
              kuery: scopedKuery,
            }),
            schema,
            abortSignal: getRequestAbortedSignal(resources.request.events.aborted$),
          }),
        hasSamples: (functions: TopNFunctions): boolean => functions.TotalCount > 0,
      });
      if (!match) {
        return undefined;
      }

      return { functions: match.result, scope: match.candidate.scope, ...correlation };
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
