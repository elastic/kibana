/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createJourneyScreenshotRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/journey/screenshot/{checkGroup}/{stepIndex}',
  validate: {
    params: schema.object({
      checkGroup: schema.string(),
      stepIndex: schema.number(),
      _debug: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }) => {
    const { checkGroup, stepIndex } = request.params;

    const result = await libs.requests.getJourneyScreenshot({
      uptimeEsClient,
      checkGroup,
      stepIndex,
    });

    if (result === null) {
      return response.notFound();
    }
    return response.ok({
      body: Buffer.from(result.blob, 'base64'),
      headers: {
        'content-type': 'image/png',
        'cache-control': 'max-age=600',
        'caption-name': result.stepName,
        'max-steps': result.totalSteps,
      },
    });
  },
});

export const createLastSuccessfulStepScreenshotRoute: UMRestApiRouteFactory = (
  libs: UMServerLibs
) => ({
  method: 'GET',
  path: '/api/uptime/step/screenshot/{monitorId}/{stepIndex}',
  validate: {
    params: schema.object({
      monitorId: schema.string(),
      stepIndex: schema.number(),
    }),
    query: schema.object({
      timestamp: schema.number(),
      _debug: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }) => {
    const { monitorId, stepIndex } = request.params;
    const { timestamp } = request.query;

    const result = await libs.requests.getStepLastSuccessfulScreenshot({
      uptimeEsClient,
      monitorId,
      stepIndex,
      timestamp,
    });

    if (result === null) {
      return response.notFound();
    }
    return response.ok({
      body: Buffer.from(result.blob, 'base64'),
      headers: {
        'content-type': 'image/png',
        'cache-control': 'max-age=600',
        'caption-name': result.stepName,
        'max-steps': result.totalSteps,
      },
    });
  },
});
