/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/has_data',
  options: { tags: [] },
  handler: async (resources) => {
    const { core } = resources.context;
    const savedObjectsClient = core.savedObjects.client;
    const fleetPluginStart = await resources.plugins.fleet.start();

    const packagePolicies = await fleetPluginStart.packagePolicyService.list(
      savedObjectsClient,
      { kuery: 'ingest-package-policies.package.name:apm' }
    );
    return { hasData: packagePolicies.total > 0 };
  },
});

export const ApmFleetRouteRepository = createApmServerRouteRepository().add(
  hasFleetDataRoute
);
