/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RefResult, ScreenshotResult } from '../../../common/runtime_types';
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

function isRef(data: unknown): data is RefResult {
  return !!data && (data as RefResult).synthetics?.type === 'step/screenshot_ref';
}

function isScreenshot(data: unknown): data is ScreenshotResult {
  return !!data && (data as ScreenshotResult).synthetics?.type === 'step/scerenshot';
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

    const result = await libs.requests.getJourneyScreenshot({
      uptimeEsClient,
      checkGroup,
      stepIndex,
    });

    if (isScreenshot(result)) {
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
    } else if (isRef(result)) {
      const blockIds = result.screenshot_ref.blocks.map(({ hash }) => hash);
      const blocks: ScreenshotBlock[] = await libs.requests.getJourneyScreenshotBlocks({
        uptimeEsClient,
        blockIds,
      });
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
