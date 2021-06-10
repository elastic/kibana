/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { ScreenshotBlock } from '../../lib/requests/get_journey_screenshot_blocks';
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

    // TODO: optimization by fetching full doc for ref or ss to skip stage 2 query
    const screenshotTypeResult = await libs.requests.getJourneyScreenshotType({
      uptimeEsClient,
      checkGroup,
      stepIndex,
    });

    if (screenshotTypeResult === 'step/screenshot') {
      const result = await libs.requests.getJourneyScreenshot({
        uptimeEsClient,
        checkGroup,
        stepIndex,
      });

      if (result === null || !result.blob) {
        return response.notFound();
      }
      return response.ok({
        body: Buffer.from(result.blob, 'base64'),
        headers: {
          'content-type': result.mimeType || 'image/png', // falls back to 'image/png' for earlier versions of synthetics
          ...getSharedHeaders(result.stepName, result.totalSteps),
        },
      });
    } else if (screenshotTypeResult === 'step/screenshot_ref') {
      const { ref, totalSteps } = await libs.requests.getJourneyScreenshotRef({
        uptimeEsClient,
        checkGroup,
        stepIndex,
      });
      // const blockIds = ref.screenshot_ref.blocks.map(({ hash }) => hash);
      // const blocks: ScreenshotBlock[] = await libs.requests.getJourneyScreenshotBlocks({
      //   uptimeEsClient,
      //   blockIds,
      // });
      return response.ok({
        body: {
          screenshotRef: ref,
          // blocks,
        },
        headers: {
          'content-type': 'application/json',
          ...getSharedHeaders(ref.synthetics.step.name, totalSteps ?? 0),
        },
      });
    }

    return response.notFound();
  },
});
