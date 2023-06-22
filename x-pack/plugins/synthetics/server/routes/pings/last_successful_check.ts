/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getLastSuccessfulCheckScreenshot } from '../../legacy_uptime/routes/synthetics/last_successful_check';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const createLastSuccessfulCheckRoute: SyntheticsRestApiRouteFactory = (
  libs: UMServerLibs
) => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_SUCCESSFUL_CHECK,
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      stepIndex: schema.number(),
      timestamp: schema.string(),
      location: schema.maybe(schema.string()),
    }),
  },
  handler: async (routeProps) => {
    return await getLastSuccessfulCheckScreenshot(routeProps);
  },
});
