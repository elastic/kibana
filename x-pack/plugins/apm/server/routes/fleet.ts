/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import { AgentPolicy, PackagePolicy } from '../../../fleet/common';
import { getFleetAgents } from '../lib/fleet/get_agents';
import { getApmPackgePolicies } from '../lib/fleet/get_apm_package_policies';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const POLICY_ELASTIC_AGENT_ON_CLOUD = 'policy-elastic-agent-on-cloud';

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/has_data',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const fleetPluginStart = await plugins.fleet.start();
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });
    return { hasData: packagePolicies.total > 0 };
  },
});

function getAgentPolicyCredentials(
  agent: AgentPolicy,
  policiesGroupedById: Record<string, PackagePolicy>
) {
  const packagePolicy = policiesGroupedById[agent.id];
  const apmServerCompiledInputs =
    packagePolicy.inputs[0].compiled_input['apm-server'];
  return {
    id: agent.id,
    name: agent.name,
    apmServerUrl: apmServerCompiledInputs?.host,
    secretToken: apmServerCompiledInputs?.secret_token,
  };
}

const fleetAgentsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/agents',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const cloudSetup = plugins.cloud?.setup;
    const cloudCredentials = cloudSetup
      ? {
          apmServerUrl: cloudSetup?.apm.url,
          secretToken: cloudSetup?.apm.secretToken,
        }
      : undefined;

    const fleetPluginStart = await plugins.fleet.start();
    // fetches package policies that contains APM integrations
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });

    const policiesGroupedById = keyBy(packagePolicies.items, 'policy_id');

    // fetches all agents with the found package policies
    const agents = await getFleetAgents({
      policyIds: Object.keys(policiesGroupedById),
      core,
      fleetPluginStart,
    });

    const cloudAgentPolicy = agents.find(
      ({ name }) => name === POLICY_ELASTIC_AGENT_ON_CLOUD
    );

    return {
      cloudAgentPolicyCredential: cloudAgentPolicy
        ? getAgentPolicyCredentials(cloudAgentPolicy, policiesGroupedById)
        : undefined,
      cloudCredentials,
      agentsCredentials: agents.map((agent) => {
        return getAgentPolicyCredentials(agent, policiesGroupedById);
      }),
    };
  },
});

export const ApmFleetRouteRepository = createApmServerRouteRepository()
  .add(hasFleetDataRoute)
  .add(fleetAgentsRoute);
