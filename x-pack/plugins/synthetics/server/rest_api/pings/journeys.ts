/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const createJourneyRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.JOURNEY_CREATE,
  validate: {
    params: schema.object({
      checkGroup: schema.string(),
    }),
    query: schema.object({
      // provides a filter for the types of synthetic events to include
      // when fetching a journey's data
      syntheticEventTypes: schema.maybe(
        schema.oneOf([schema.arrayOf(schema.string()), schema.string()])
      ),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }): Promise<any> => {
    const { checkGroup } = request.params;
    const { syntheticEventTypes } = request.query;

    try {
      const [result, details] = await Promise.all([
        await libs.requests.getJourneySteps({
          uptimeEsClient,
          checkGroup,
          syntheticEventTypes,
        }),
        await libs.requests.getJourneyDetails({
          uptimeEsClient,
          checkGroup,
        }),
      ]);

      return {
        checkGroup,
        steps: result,
        details,
      };
    } catch (e: unknown) {
      return response.custom({ statusCode: 500, body: { message: e } });
    }
  },
});

export const createJourneyFailedStepsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.JOURNEY_FAILED_STEPS,
  validate: {
    query: schema.object({
      checkGroups: schema.arrayOf(schema.string()),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }): Promise<any> => {
    const { checkGroups } = request.query;
    try {
      const result = await libs.requests.getJourneyFailedSteps({
        uptimeEsClient,
        checkGroups,
      });
      return {
        checkGroups,
        steps: result,
      };
    } catch (e) {
      return response.customError({ statusCode: 500, body: e });
    }
  },
});
