/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceLocations } from '../../synthetics_service/get_service_locations';
import { UMRestApiRouteFactory } from '../../legacy_uptime/routes';
import { API_URLS } from '../../../common/constants';
import { getSyntheticsPrivateLocations } from '../../legacy_uptime/lib/saved_objects/private_locations';

export const getServiceLocationsRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SERVICE_LOCATIONS,
  validate: {},
  handler: async ({ server, savedObjectsClient }): Promise<any> => {
    const privateLocations = await getSyntheticsPrivateLocations(savedObjectsClient);
    const agentPolicies = await server.syntheticsService.privateLocationAPI.getAgentPolicies();

    if (server.syntheticsService.locations.length > 0) {
      const { throttling, locations } = server.syntheticsService;

      return {
        throttling,
        locations: [
          ...locations,
          ...(privateLocations?.map((loc) => ({
            label: loc.name,
            isServiceManaged: false,
            isInvalid: agentPolicies.find((policy) => policy.id === loc.policyHostId) === undefined,
            ...loc,
          })) ?? []),
        ],
      };
    }

    return getServiceLocations(server);
  },
});
