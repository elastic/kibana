/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createLastSuccessfulStepRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/synthetics/step/success/',
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      stepIndex: schema.number(),
      timestamp: schema.string(),
      _debug: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }) => {
    const { timestamp, monitorId, stepIndex } = request.query;

    return await libs.requests.getStepLastSuccessfulStep({
      uptimeEsClient,
      monitorId,
      stepIndex,
      timestamp,
    });
  },
});
