/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  isRefResult,
  isFullScreenshot,
  ScreenshotBlockDoc,
} from '../../../common/runtime_types/ping/synthetics';
import { UMServerLibs } from '../../lib/lib';
import { ScreenshotReturnTypesUnion } from '../../lib/requests/get_journey_screenshot';
import { UMRestApiRouteFactory } from '../types';

function getSharedHeaders(stepName: string, totalSteps: number) {
  return {
    'cache-control': 'max-age=600',
    'caption-name': stepName,
    'max-steps': String(totalSteps),
  };
}

export const createJourneyScreenshotRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/journey/screenshot/{checkGroup}/{stepIndex}',
  validate: {
    params: schema.object({
      checkGroup: schema.string(),
      stepIndex: schema.number(),
      _inspect: schema.maybe(schema.boolean()),
    }),
    query: schema.object({
      _inspect: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }) => {
    const { checkGroup, stepIndex } = request.params;

    let result: ScreenshotReturnTypesUnion | null = null;
    try {
      result = await libs.requests.getJourneyScreenshot({
        uptimeEsClient,
        checkGroup,
        stepIndex,
      });
    } catch (e) {
      return response.customError({ body: { message: e }, statusCode: 500 });
    }

    if (isFullScreenshot(result)) {
      if (!result.synthetics.blob) {
        return response.notFound();
      }

      return response.ok({
        body: Buffer.from(result.synthetics.blob, 'base64'),
        headers: {
          'content-type': result.synthetics.blob_mime || 'image/png', // falls back to 'image/png' for earlier versions of synthetics
          ...getSharedHeaders(result.synthetics.step.name, result.totalSteps),
        },
      });
    } else if (isRefResult(result)) {
      const blockIds = result.screenshot_ref.blocks.map(({ hash }) => hash);
      let blocks: ScreenshotBlockDoc[];
      try {
        blocks = await libs.requests.getJourneyScreenshotBlocks({
          uptimeEsClient,
          blockIds,
        });
      } catch (e: unknown) {
        return response.custom({ statusCode: 500, body: { message: e } });
      }
      return response.ok({
        body: {
          screenshotRef: result,
          blocks,
        },
        headers: getSharedHeaders(result.synthetics.step.name, result.totalSteps ?? 0),
      });
    }

    return response.notFound();
  },
});
