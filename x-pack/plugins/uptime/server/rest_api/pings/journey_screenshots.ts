/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isRefResult, isFullScreenshot } from '../../../common/runtime_types/ping/synthetics';
import { UMServerLibs } from '../../lib/lib';
import { ScreenshotReturnTypesUnion } from '../../lib/requests/get_journey_screenshot';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

function getSharedHeaders(stepName: string, totalSteps: number) {
  return {
    'cache-control': 'max-age=600',
    'caption-name': stepName,
    'max-steps': String(totalSteps),
  };
}

export const createJourneyScreenshotRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.JOURNEY_SCREENSHOT,
  validate: {
    params: schema.object({
      checkGroup: schema.string(),
      stepIndex: schema.number(),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }) => {
    const { checkGroup, stepIndex } = request.params;

    const result: ScreenshotReturnTypesUnion | null = await libs.requests.getJourneyScreenshot({
      uptimeEsClient,
      checkGroup,
      stepIndex,
    });

    if (isFullScreenshot(result) && typeof result.synthetics?.blob !== 'undefined') {
      return response.ok({
        body: Buffer.from(result.synthetics.blob, 'base64'),
        headers: {
          'content-type': result.synthetics.blob_mime || 'image/png', // falls back to 'image/png' for earlier versions of synthetics
          ...getSharedHeaders(result.synthetics.step.name, result.totalSteps),
        },
      });
    } else if (isRefResult(result)) {
      return response.ok({
        body: {
          screenshotRef: result,
        },
        headers: getSharedHeaders(result.synthetics.step.name, result.totalSteps),
      });
    }

    return response.notFound();
  },
});
