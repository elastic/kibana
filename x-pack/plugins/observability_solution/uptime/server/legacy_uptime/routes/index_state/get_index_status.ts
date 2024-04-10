/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../../common/constants';

export const createGetIndexStatusRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.INDEX_STATUS,
  validate: {
    query: schema.object({
      from: schema.maybe(schema.string()),
      to: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }): Promise<any> => {
    const { from, to } = request.query;
    try {
      return await libs.requests.getIndexStatus({ uptimeEsClient, range: { from, to } });
    } catch (e) {
      if (e.meta?.statusCode === 403) {
        return response.customError({
          statusCode: 403,
          body: {
            message:
              'unauthorized: You do not have the required permissions to read uptime indices',
          },
        });
      }

      throw e;
    }
  },
});
