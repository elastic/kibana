/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { KibanaTelemetryAdapter } from '../../lib/adapters/telemetry';
import { UMRestApiRouteFactory } from '../types';
import { PageViewParams } from '../../lib/adapters/telemetry/types';

export const createLogPageViewRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: '/api/uptime/logPageView',
  validate: {
    body: schema.object({
      page: schema.string(),
      dateStart: schema.string(),
      dateEnd: schema.string(),
      autoRefreshEnabled: schema.boolean(),
      autorefreshInterval: schema.number(),
    }),
  },
  handler: async ({ callES, dynamicSettings }, _context, _request, response): Promise<any> => {
    const result = KibanaTelemetryAdapter.countPageView(_request.body as PageViewParams);
    return response.ok({
      body: result,
    });
  },
  options: {
    tags: ['access:uptime-read'],
  },
});
