/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type ProfilingHostsFlamegraphResponse,
  type ProfilingHostsFunctionsResponse,
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
import { getServiceCorrelationFields } from '../get_service_correlation_fields';

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
      await getApmEventClient(resources),
      await plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      const { start, end, environment, documentType, rollupInterval, kuery } = params.query;
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
      const startSecs = start / 1000;
      const endSecs = end / 1000;

      const match = await fetchFirstScopeWithSamples({
        candidates,
        kuery,
        fetch: (scopedKuery: string): Promise<BaseFlameGraph> =>
          fetchFlamegraph({
            profilingDataAccessStart,
            core,
            esClient: esClient.asCurrentUser,
            start: startSecs,
            end: endSecs,
            kuery: scopedKuery,
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
      await getApmEventClient(resources),
      await plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      const { start, end, environment, startIndex, endIndex, documentType, rollupInterval, kuery } =
        params.query;
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

      const startSecs = start / 1000;
      const endSecs = end / 1000;

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
            start: startSecs,
            end: endSecs,
            kuery: scopedKuery,
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

export const profilingHostsRouteRepository = {
  ...profilingHostsFlamegraphRoute,
  ...profilingHostsFunctionsRoute,
};
