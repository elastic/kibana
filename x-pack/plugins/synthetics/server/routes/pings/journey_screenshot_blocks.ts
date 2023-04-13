/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { journeyScreenshotBlocksHandler } from '../../legacy_uptime/routes/pings/journey_screenshot_blocks';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const createJourneyScreenshotBlocksRoute: SyntheticsRestApiRouteFactory = (
  libs: UMServerLibs
) => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.JOURNEY_SCREENSHOT_BLOCKS,
  validate: {
    body: schema.object({
      hashes: schema.arrayOf(schema.string()),
    }),
  },
  handler: async (routeProps) => {
    return await journeyScreenshotBlocksHandler(routeProps);
  },
});
