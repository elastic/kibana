/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { getFleetAgents } from '../lib/fleet/get_agents';
import { getApmPackgePolicies } from '../lib/fleet/get_apm_package_policies';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const FLEET_REQUIRED_MESSAGE = i18n.translate(
  'xpack.apm.fleet_has_data.fleetRequired',
  {
    defaultMessage: `Fleet plugin is required`,
  }
);

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/has_data',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      throw Boom.internal(FLEET_REQUIRED_MESSAGE);
    }
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });
    return { hasData: packagePolicies.total > 0 };
  },
});

const fleetAgentsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/agents',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const cloudSetup = plugins.cloud?.setup;
    const cloudStandaloneSetup = cloudSetup
      ? {
          apmServerUrl: cloudSetup?.apm.url,
          secretToken: cloudSetup?.apm.secretToken,
        }
      : undefined;

    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      throw Boom.internal(FLEET_REQUIRED_MESSAGE);
    }
    // fetches package policies that contains APM integrations
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });

    const policiesGroupedById = keyBy(packagePolicies.items, 'policy_id');

    // fetches all agents with the found package policies
    const fleetAgents = await getFleetAgents({
      policyIds: Object.keys(policiesGroupedById),
      core,
      fleetPluginStart,
    });

    return {
      cloudStandaloneSetup,
      fleetAgents: fleetAgents.map((agent) => {
        const packagePolicy = policiesGroupedById[agent.id];
        const apmServerCompiledInputs =
          packagePolicy.inputs[0].compiled_input['apm-server'];
        return {
          id: agent.id,
          name: agent.name,
          apmServerUrl: apmServerCompiledInputs?.host,
          secretToken: apmServerCompiledInputs?.secret_token,
        };
      }),
    };
  },
});

export const ApmFleetRouteRepository = createApmServerRouteRepository()
  .add(hasFleetDataRoute)
  .add(fleetAgentsRoute);
