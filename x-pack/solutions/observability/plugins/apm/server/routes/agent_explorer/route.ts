/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type AgentExplorerAgentsResponse,
  type AgentLatestVersionsResponse,
  type AgentExplorerAgentInstancesRouteResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getAgents } from './get_agents';
import { getAgentInstances } from './get_agent_instances';
import { fetchAgentsLatestVersion } from './fetch_agents_latest_version';

const agentExplorerRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentExplorer.agentsPerService.endpoint,
  params: routeDefinitions.agentExplorer.agentsPerService.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler(resources): Promise<AgentExplorerAgentsResponse> {
    const { params, request, core } = resources;

    const { environment, kuery, start, end, probability, serviceName, agentLanguage } =
      params.query;

    const coreStart = await core.start();

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability }),
    ]);

    return getAgents({
      environment,
      serviceName,
      agentLanguage,
      kuery,
      apmEventClient,
      start,
      end,
      randomSampler,
    });
  },
});

const latestAgentVersionsRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentExplorer.latestAgentVersions.endpoint,
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler(resources): Promise<AgentLatestVersionsResponse> {
    const { logger, config } = resources;

    return fetchAgentsLatestVersion(logger, config.latestAgentVersionsUrl);
  },
});

const agentExplorerInstanceRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentExplorer.agentInstances.endpoint,
  params: routeDefinitions.agentExplorer.agentInstances.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler(resources): Promise<AgentExplorerAgentInstancesRouteResponse> {
    const { params } = resources;

    const { environment, kuery, start, end } = params.query;

    const { serviceName } = params.path;

    const apmEventClient = await getApmEventClient(resources);

    return {
      items: await getAgentInstances({
        environment,
        serviceName,
        kuery,
        apmEventClient,
        start,
        end,
      }),
    };
  },
});

export const agentExplorerRouteRepository = {
  ...agentExplorerRoute,
  ...latestAgentVersionsRoute,
  ...agentExplorerInstanceRoute,
};
