/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const createMonitorListHistogramRoute: UMRestApiRouteFactory = (libs) => ({
  method: 'POST',
  path: API_URLS.MONITOR_LIST_HISTOGRAM,
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      filters: schema.maybe(schema.string()),
      statusFilter: schema.maybe(schema.string()),
      query: schema.maybe(schema.string()),
      _inspect: schema.maybe(schema.boolean()),
    }),
    body: schema.object({
      monitorIds: schema.arrayOf(schema.string()),
    }),
  },
  options: {
    tags: ['access:uptime-read'],
  },
  handler: async ({ uptimeEsClient, request }): Promise<any> => {
    const { dateRangeStart, dateRangeEnd, filters, statusFilter, query } = request.query;

    const { monitorIds } = request.body;

    return await libs.requests.getHistogramForMonitors({
      uptimeEsClient,
      dateRangeStart,
      dateRangeEnd,
      filters,
      query,
      statusFilter,
      monitorIds,
    });
  },
});
