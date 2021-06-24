/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { getApmPackgePolicies } from '../lib/fleet/get_apm_package_policies';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const hasFleetDataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/fleet/has_data',
  options: { tags: [] },
  handler: async ({ core, plugins }) => {
    const fleetPluginStart = await plugins.fleet?.start();
    if (!fleetPluginStart) {
      throw Boom.internal(
        i18n.translate('xpack.apm.fleet_has_data.fleetRequired', {
          defaultMessage: `Fleet plugin is required`,
        })
      );
    }
    const packagePolicies = await getApmPackgePolicies({
      core,
      fleetPluginStart,
    });
    return { hasData: packagePolicies.total > 0 };
  },
});

export const ApmFleetRouteRepository = createApmServerRouteRepository().add(
  hasFleetDataRoute
);
