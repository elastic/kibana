/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../../../legacy/plugins/uptime/common/constants/rest_api';

export const createGetMonitorRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.MONITOR_SELECTED,

  validate: {
    query: schema.object({
      monitorId: schema.string(),
    }),
  },
  options: {
    tags: ['access:uptime-read'],
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const { monitorId } = request.query;

    return response.ok({
      body: {
        ...(await libs.requests.getMonitor({ callES, dynamicSettings, monitorId })),
      },
    });
  },
});

export const createGetStatusBarRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.MONITOR_STATUS,

  validate: {
    query: schema.object({
      monitorId: schema.string(),
      dateStart: schema.string(),
      dateEnd: schema.string(),
    }),
  },
  options: {
    tags: ['access:uptime-read'],
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const { monitorId, dateStart, dateEnd } = request.query;
    const result = await libs.requests.getLatestMonitor({
      callES,
      dynamicSettings,
      monitorId,
      dateStart,
      dateEnd,
    });
    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
