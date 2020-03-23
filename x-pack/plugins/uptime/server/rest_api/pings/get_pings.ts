/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../../../legacy/plugins/uptime/common/constants/rest_api';

export const createGetPingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.PINGS,
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      location: schema.maybe(schema.string()),
      monitorId: schema.maybe(schema.string()),
      size: schema.maybe(schema.number()),
      sort: schema.maybe(schema.string()),
      status: schema.maybe(schema.string()),
    }),
  },
  options: {
    tags: ['access:uptime-read'],
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const { dateRangeStart, dateRangeEnd, location, monitorId, size, sort, status } = request.query;

    const result = await libs.requests.getPings({
      callES,
      dynamicSettings,
      dateRangeStart,
      dateRangeEnd,
      monitorId,
      status,
      sort,
      size,
      location,
    });

    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
