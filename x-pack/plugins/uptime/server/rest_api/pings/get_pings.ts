/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { GetPingsParamsType } from '../../../common/runtime_types';

export const createGetPingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.PINGS,
  validate: {
    query: schema.object({
      from: schema.string(),
      to: schema.string(),
      location: schema.maybe(schema.string()),
      monitorId: schema.maybe(schema.string()),
      index: schema.maybe(schema.number()),
      size: schema.maybe(schema.number()),
      sort: schema.maybe(schema.string()),
      status: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ callES, dynamicSettings }, _context, request, response): Promise<any> => {
    const { from, to, ...optional } = request.query;
    const params = GetPingsParamsType.decode({ dateRange: { from, to }, ...optional });
    if (isLeft(params)) {
      // eslint-disable-next-line no-console
      console.error(new Error(PathReporter.report(params).join(';')));
      return response.badRequest({ body: { message: 'Received invalid request parameters.' } });
    }

    const result = await libs.requests.getPings({
      callES,
      dynamicSettings,
      ...params.right,
    });

    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
