/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { API_URLS } from '../../../common/constants';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const DEFAULT_FROM = 'now-5m';
export const DEFAULT_TO = 'now';

const DEFAULT_SIZE = 25;
const DEFAULT_SORT = 'not_after';
const DEFAULT_DIRECTION = 'asc';

export const createGetCertsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.CERTS,
  validate: {
    query: schema.object({
      from: schema.maybe(schema.string()),
      to: schema.maybe(schema.string()),
      search: schema.maybe(schema.string()),
      index: schema.maybe(schema.number()),
      size: schema.maybe(schema.number()),
      sortBy: schema.maybe(schema.string()),
      direction: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const index = request.query?.index ?? 0;
    const size = request.query?.size ?? DEFAULT_SIZE;
    const from = request.query?.from ?? DEFAULT_FROM;
    const to = request.query?.to ?? DEFAULT_TO;
    const sortBy = request.query?.sortBy ?? DEFAULT_SORT;
    const direction = request.query?.direction ?? DEFAULT_DIRECTION;
    const { search } = request.query;
    const result = await libs.requests.getCerts({
      callES,
      dynamicSettings,
      index,
      search,
      size,
      from,
      to,
      sortBy,
      direction,
    });
    return response.ok({
      body: {
        certs: result.certs,
        total: result.total,
      },
    });
  },
});
