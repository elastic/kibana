/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    }),
  },
  handler: async ({ uptimeEsClient }, _context, request, response) => {
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
