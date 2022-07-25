/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllLocations } from '../../synthetics_service/get_all_locations';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { API_URLS } from '../../../common/constants';

export const getServiceLocationsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SERVICE_LOCATIONS,
  validate: {},
  handler: async ({ server, savedObjectsClient, syntheticsMonitorClient }): Promise<any> => {
    const { publicLocations, privateLocations, throttling } = await getAllLocations(
      server,
      syntheticsMonitorClient,
      savedObjectsClient
    );

    return {
      locations: [...publicLocations, ...privateLocations],
      throttling,
    };
  },
});
