/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../lib/lib';
import { UMRestApiRouteFactory } from '.';
import { API_URLS } from '../../common/constants';

const DEFAULT_INDEX = 0;
const DEFAULT_SIZE = 25;
const DEFAULT_FROM = 'now-1d';
const DEFAULT_TO = 'now';

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
    }),
  },
  writeAccess: false,
  options: {
    tags: ['access:uptime-read'],
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const index = request.query?.index ?? DEFAULT_INDEX;
    const size = request.query?.size ?? DEFAULT_SIZE;
    const from = request.query?.from ?? DEFAULT_FROM;
    const to = request.query?.to ?? DEFAULT_TO;
    const { search } = request.query;

    return response.ok({
      body: {
        certs: await libs.requests.getCerts({
          callES,
          dynamicSettings,
          index,
          search,
          size,
          from,
          to,
        }),
      },
    });
  },
});
