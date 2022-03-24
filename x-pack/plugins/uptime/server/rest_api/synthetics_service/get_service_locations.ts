/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { getServiceLocations } from '../../lib/synthetics_service/get_service_locations';

export const getServiceLocationsRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SERVICE_LOCATIONS,
  validate: {},
  handler: async ({ server }): Promise<any> => {
    if (server.syntheticsService.locations.length > 0) {
      return { locations: server.syntheticsService.locations };
    }

    return getServiceLocations(server);
  },
});
