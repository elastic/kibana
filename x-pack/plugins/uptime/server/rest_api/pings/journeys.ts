/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
      _debug: schema.maybe(schema.boolean()),
    }),
    query: schema.object({
      // provides a filter for the types of synthetic events to include
      // when fetching a journey's data
      syntheticEventTypes: schema.maybe(
        schema.oneOf([schema.arrayOf(schema.string()), schema.string()])
      ),
    }),
  },
  handler: async ({ uptimeEsClient, request }): Promise<any> => {
    const { checkGroup } = request.params;
    const { syntheticEventTypes } = request.query;
    const result = await libs.requests.getJourneySteps({
      uptimeEsClient,
      checkGroup,
      syntheticEventTypes,
    });

    const details = await libs.requests.getJourneyDetails({
      uptimeEsClient,
      checkGroup,
    });

    return {
      checkGroup,
      steps: result,
      details,
    };
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
  handler: async ({ uptimeEsClient, request }): Promise<any> => {
    const { checkGroups } = request.query;
    const result = await libs.requests.getJourneyFailedSteps({
      uptimeEsClient,
      checkGroups,
    });

    return {
      checkGroups,
      steps: result,
    };
  },
});
