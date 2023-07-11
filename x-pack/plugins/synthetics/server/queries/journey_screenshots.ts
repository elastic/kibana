/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IKibanaResponse } from '@kbn/core-http-server';
import {
  getJourneyScreenshot,
  ScreenshotReturnTypesUnion,
} from '../legacy_uptime/lib/requests/get_journey_screenshot';
import { isFullScreenshot, isRefResult, RefResult } from '../../common/runtime_types';
import { RouteContext, UptimeRouteContext } from '../routes/types';

export type ClientContract = Buffer | { screenshotRef: RefResult };

function getSharedHeaders(stepName: string, totalSteps: number) {
  return {
    'cache-control': 'max-age=600',
    'caption-name': stepName,
    'max-steps': String(totalSteps),
  };
}

export const journeyScreenshotHandler = async ({
  response,
  request,
  uptimeEsClient,
}: RouteContext | UptimeRouteContext): Promise<IKibanaResponse<ClientContract>> => {
  const { checkGroup, stepIndex } = request.params;

  const result: ScreenshotReturnTypesUnion | null = await getJourneyScreenshot({
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
};
