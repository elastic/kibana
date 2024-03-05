/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { IKibanaResponse } from '@kbn/core/server';
import { isRight } from 'fp-ts/lib/Either';
import { schema } from '@kbn/config-schema';
import { getJourneyScreenshotBlocks } from '../../lib/requests/get_journey_screenshot_blocks';
import { UMServerLibs } from '../../lib/lib';
import { RouteContext, UMRestApiRouteFactory, UptimeRouteContext } from '../types';
import { API_URLS } from '../../../../common/constants';
import { ScreenshotBlockDoc } from '../../../../common/runtime_types/ping/synthetics';

function isStringArray(data: unknown): data is string[] {
  return isRight(t.array(t.string).decode(data));
}

export const createJourneyScreenshotBlocksRoute: UMRestApiRouteFactory<ScreenshotBlockDoc[]> = (
  libs: UMServerLibs
) => ({
  method: 'POST',
  path: API_URLS.JOURNEY_SCREENSHOT_BLOCKS,
  validate: {
    body: schema.object({
      hashes: schema.arrayOf(schema.string()),
    }),
  },
  handler: async (routeProps) => {
    return await journeyScreenshotBlocksHandler(routeProps);
  },
});

export const journeyScreenshotBlocksHandler = async ({
  response,
  request,
  uptimeEsClient,
}: RouteContext | UptimeRouteContext): Promise<IKibanaResponse<ScreenshotBlockDoc[]>> => {
  const { hashes: blockIds } = request.body;

  if (!isStringArray(blockIds)) return response.badRequest();

  const result = await getJourneyScreenshotBlocks({
    blockIds,
    uptimeEsClient,
  });

  if (result.length === 0) {
    return response.notFound();
  }

  return response.ok({
    body: result,
  });
};
