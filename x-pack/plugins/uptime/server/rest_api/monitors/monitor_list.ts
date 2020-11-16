/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      sortField: schema.maybe(schema.string()),
      sortDirection: schema.maybe(schema.string()),
      pageSize: schema.number(),
      pageIndex: schema.number(),
    }),
  },
  options: {
    tags: ['access:uptime-read'],
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    try {
      const {
        dateRangeStart,
        dateRangeEnd,
        filters,
        pagination,
        statusFilter,
        pageSize,
        pageIndex,
        sortField,
        sortDirection,
      } = request.query;

      const decodedPagination = pagination
        ? JSON.parse(decodeURIComponent(pagination))
        : CONTEXT_DEFAULTS.CURSOR_PAGINATION;

      const result = await libs.requests.getMonitorStates({
        callES,
        dynamicSettings,
        dateRangeStart,
        dateRangeEnd,
        pagination: decodedPagination,
        pageSize,
        pageIndex,
        sortField,
        sortDirection,
        filters,
        // this is added to make typescript happy,
        // this sort of reassignment used to be further downstream but I've moved it here
        // because this code is going to be decomissioned soon
        statusFilter: statusFilter || undefined,
      });

      return response.ok({
        body: result,
      });
    } catch (e) {
      return response.internalError({ body: { message: e.message } });
    }
  },
});
