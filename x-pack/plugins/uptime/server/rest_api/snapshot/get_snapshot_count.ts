/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const createGetSnapshotCount: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.SNAPSHOT_COUNT,
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      filters: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const { dateRangeStart, dateRangeEnd, filters } = request.query;
    const result = await libs.requests.getSnapshotCount({
      callES,
      dynamicSettings,
      dateRangeStart,
      dateRangeEnd,
      filters,
    });
    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
