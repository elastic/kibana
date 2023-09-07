/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsRestApiRouteFactory } from '../types';
import { getAllLocationsWithMeta } from '../../synthetics_service/get_all_locations';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getAllLocationsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.ALL_LOCATIONS,
  validate: {},
  handler: async (routeContext): Promise<any> => {
    const { throttling, allLocations } = await getAllLocationsWithMeta(routeContext);

    return {
      locations: allLocations,
      throttling,
    };
  },
});
