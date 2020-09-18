/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import fs from 'fs';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createJourneyScreenshotRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/journey/screenshot/{checkGroup}/{stepIndex}',
  validate: {
    params: schema.object({
      checkGroup: schema.string(),
      stepIndex: schema.number(),
    }),
  },
  handler: async ({ callES, dynamicSettings }, context, request, response) => {
    const { checkGroup, stepIndex } = request.params;
    const result = await libs.requests.getJourneyScreenshot({
      callES,
      dynamicSettings,
      checkGroup,
      stepIndex,
    });

    return response.ok({
      body: result,
      headers: {
        // 'cache-control': 'max-age=600000000',
      },
    });
  },
});
