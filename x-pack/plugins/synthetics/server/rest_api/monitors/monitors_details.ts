/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const createGetMonitorDetailsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.MONITOR_DETAILS,
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      dateStart: schema.maybe(schema.string()),
      dateEnd: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ uptimeEsClient, context, request }): Promise<any> => {
    const { monitorId, dateStart, dateEnd } = request.query;

    const rulesClient = (await context.alerting)?.getRulesClient();

    return await libs.requests.getMonitorDetails({
      uptimeEsClient,
      monitorId,
      dateStart,
      dateEnd,
      rulesClient,
    });
  },
});
