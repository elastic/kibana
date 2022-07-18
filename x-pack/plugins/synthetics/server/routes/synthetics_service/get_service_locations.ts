/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceLocations } from '../../synthetics_service/get_service_locations';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { API_URLS } from '../../../common/constants';
import { getSyntheticsPrivateLocations } from '../../legacy_uptime/lib/saved_objects/private_locations';

export const getServiceLocationsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SERVICE_LOCATIONS,
  validate: {},
  handler: async ({ server, savedObjectsClient, syntheticsMonitorClient }): Promise<any> => {
    const { syntheticsService, privateLocationAPI } = syntheticsMonitorClient;
    const privateLocations = await getSyntheticsPrivateLocations(savedObjectsClient);
    const agentPolicies = await privateLocationAPI.getAgentPolicies();

    const privateLocs =
      privateLocations?.map((loc) => ({
        label: loc.name,
        isServiceManaged: false,
        isInvalid: agentPolicies.find((policy) => policy.id === loc.policyHostId) === undefined,
        ...loc,
      })) ?? [];

    if (syntheticsService.locations.length > 0) {
      const { throttling, locations } = syntheticsService;

      return {
        throttling,
        locations: [...locations, ...privateLocs],
      };
    }

    const { locations, throttling } = await getServiceLocations(server);

    return {
      locations: [...locations, ...privateLocs],
      throttling,
    };
  },
});
