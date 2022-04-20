/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const createGetPingHistogramRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.PING_HISTOGRAM,
  validate: {
    query: schema.object({
      dateStart: schema.string(),
      dateEnd: schema.string(),
      monitorId: schema.maybe(schema.string()),
      filters: schema.maybe(schema.string()),
      bucketSize: schema.maybe(schema.string()),
      query: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ uptimeEsClient, request }): Promise<any> => {
    const { dateStart, dateEnd, monitorId, filters, bucketSize, query } = request.query;

    return await libs.requests.getPingHistogram({
      uptimeEsClient,
      dateStart,
      dateEnd,
      monitorId,
      filters,
      bucketSize,
      query,
    });
  },
});
