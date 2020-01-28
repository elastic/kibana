/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { LicenseState } from '../lib';
import { verifyApiAccess } from '../lib/license_api_access';
import { Alert } from '../types';

export const bodySchema = schema.object({
  name: schema.string(),
  enabled: schema.boolean({ defaultValue: false }),
  alertTypeId: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  consumer: schema.string(),
  throttle: schema.nullable(schema.duration()),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string(), // replace with duration
  }),
  actions: schema.arrayOf(
    schema.object({
      id: schema.string(),
      group: schema.string(),
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    })
  ),
});

export const createAlertRoute = (router: IRouter, licenseState: LicenseState) => {
  router.post(
    {
      path: '/api/alert',
      validate: {
        body: bodySchema,
      },
      options: {
        tags: ['access:alerting-all'],
      },
    },
    router.handleLegacyErrors(async function(
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, TypeOf<typeof bodySchema>, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      verifyApiAccess(licenseState);

      const alertsClient = context.alerting.getAlertsClient();
      const alert = req.body;
      const alertRes: Alert = await alertsClient.create({ data: alert });
      return res.ok({
        body: alertRes,
      });
    })
  );
};
