/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const createGetPingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.PINGS,
  validate: {
    query: schema.object({
      from: schema.string(),
      to: schema.string(),
      locations: schema.maybe(schema.string()),
      monitorId: schema.maybe(schema.string()),
      index: schema.maybe(schema.number()),
      size: schema.maybe(schema.number()),
      sort: schema.maybe(schema.string()),
      status: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ uptimeEsClient }, _context, request, response): Promise<any> => {
    const { from, to, index, monitorId, status, sort, size, locations } = request.query;

    const result = await libs.requests.getPings({
      uptimeEsClient,
      dateRange: { from, to },
      index,
      monitorId,
      status,
      sort,
      size,
      locations: locations ? JSON.parse(locations) : [],
    });

    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
