/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS, CONTEXT_DEFAULTS } from '../../../common/constants';

export const createMonitorListRoute: UMRestApiRouteFactory = (libs) => ({
  method: 'GET',
  path: API_URLS.MONITOR_LIST,
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      filters: schema.maybe(schema.string()),
      pagination: schema.maybe(schema.string()),
      statusFilter: schema.maybe(schema.string()),
      query: schema.maybe(schema.string()),
      pageSize: schema.number(),
    }),
  },
  options: {
    tags: ['access:uptime-read'],
  },
  handler: async ({ uptimeEsClient, request, response }): Promise<any> => {
    const { dateRangeStart, dateRangeEnd, filters, pagination, statusFilter, pageSize, query } =
      request.query;

    const decodedPagination = pagination
      ? JSON.parse(decodeURIComponent(pagination))
      : CONTEXT_DEFAULTS.CURSOR_PAGINATION;

    try {
      const result = await libs.requests.getMonitorStates({
        uptimeEsClient,
        dateRangeStart,
        dateRangeEnd,
        pagination: decodedPagination,
        pageSize,
        filters,
        query,
        statusFilter,
      });

      return result;
    } catch (e) {
      /**
       * This particular error is usually indicative of a mapping problem within the user's
       * indices. It's relevant for the UI because we will be able to provide the user with a
       * tailored message to help them remediate this problem on their own with minimal effort.
       */
      if (e.name === 'ResponseError') {
        return response.badRequest({ body: e });
      }
      throw e;
    }
  },
});
