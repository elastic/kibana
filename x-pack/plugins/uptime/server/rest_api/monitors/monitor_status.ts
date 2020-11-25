/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

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
  handler: async ({ uptimeEsClient }, _context, request, response): Promise<any> => {
    const { monitorId, dateStart, dateEnd } = request.query;
    const result = await libs.requests.getLatestMonitor({
      uptimeEsClient,
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
