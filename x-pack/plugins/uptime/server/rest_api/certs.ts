/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../lib/lib';
import { UMRestApiRouteFactory } from '.';
import { API_URLS } from '../../../../legacy/plugins/uptime/common/constants/rest_api';

export const createGetCertsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.CERTS,
  validate: {
    query: schema.object({
      search: schema.maybe(schema.string()),
      from: schema.number(),
      size: schema.number(),
    }),
  },
  writeAccess: false,
  options: {
    tags: ['access:uptime-read'],
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const { from, search, size } = request.query;

    return response.ok({
      body: {
        certs: await libs.requests.getCerts({ callES, dynamicSettings, from, search, size }),
      },
    });
  },
});
