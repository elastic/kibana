/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createJourneyRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/journey/{checkGroup}',
  validate: {
    params: schema.object({
      checkGroup: schema.string(),
    }),
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response) => {
    const { checkGroup } = request.params;
    const result = await libs.requests.getJourneySteps({
      callES,
      dynamicSettings,
      checkGroup,
    });

    return response.ok({
      body: {
        checkGroup,
        steps: result,
      },
    });
  },
});
