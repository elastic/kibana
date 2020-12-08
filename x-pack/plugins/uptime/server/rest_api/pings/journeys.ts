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
  handler: async ({ uptimeEsClient }, _context, request, response) => {
    const { checkGroup } = request.params;
    const result = await libs.requests.getJourneySteps({
      uptimeEsClient,
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

export const createJourneyFailedStepsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/journeys/failed_steps',
  validate: {
    query: schema.object({
      checkGroups: schema.arrayOf(schema.string()),
    }),
  },
  handler: async ({ uptimeEsClient }, _context, request, response) => {
    const { checkGroups } = request.query;
    const result = await libs.requests.getJourneyFailedSteps({
      uptimeEsClient,
      checkGroups,
    });

    return response.ok({
      body: {
        checkGroups,
        steps: result,
      },
    });
  },
});
