/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isRefResult, isFullScreenshot } from '../../../common/runtime_types/ping/synthetics';
import { Ping } from '../../../common/runtime_types/ping/ping';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const createLastSuccessfulCheckRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_SUCCESSFUL_CHECK,
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      stepIndex: schema.number(),
      timestamp: schema.string(),
      location: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }) => {
    const { timestamp, monitorId, stepIndex, location } = request.query;

    const check: Ping | null = await libs.requests.getLastSuccessfulCheck({
      uptimeEsClient,
      monitorId,
      timestamp,
      location,
    });

    if (check === null) {
      return response.notFound();
    }

    if (!check.monitor.check_group) {
      return response.ok({ body: check });
    }

    const screenshot = await libs.requests.getJourneyScreenshot({
      uptimeEsClient,
      checkGroup: check.monitor.check_group,
      stepIndex,
    });

    if (screenshot === null) {
      return response.ok({ body: check });
    }

    if (check.synthetics) {
      check.synthetics.isScreenshotRef = isRefResult(screenshot);
      check.synthetics.isFullScreenshot = isFullScreenshot(screenshot);
    }

    return response.ok({
      body: check,
    });
  },
});
