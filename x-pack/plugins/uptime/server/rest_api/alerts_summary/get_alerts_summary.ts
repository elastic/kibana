/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createGetAlertsInstancesRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'POST',
  path: '/api/uptime/alerts_instances',
  validate: {
    body: schema.object({
      status: schema.maybe(schema.string()),
      consumers: schema.arrayOf(schema.string()),
    }),
    query: schema.object({
      dateStart: schema.maybe(schema.string()),
      dateEnd: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ uptimeEsClient, request, context }): Promise<any> => {
    const { dateStart, dateEnd } = request.query;
    const { status, consumers } = request.body;
    const alertsClient = context.alerting?.getAlertsClient();

    return await libs.requests.getAlertsInstances({
      uptimeEsClient,
      consumers,
      status,
      dateStart,
      dateEnd,
      alertsClient,
    });
  },
});
