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
import { LicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { validateDurationSchema } from '../lib';
import { handleDisabledApiKeysError } from './lib/error_handler';
import { Alert, BASE_ALERT_API_PATH } from '../types';

export const bodySchema = schema.object({
  name: schema.string(),
  alertTypeId: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.nullable(schema.string({ validate: validateDurationSchema })),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  actions: schema.arrayOf(
    schema.object({
      group: schema.string(),
      id: schema.string(),
      actionTypeId: schema.maybe(schema.string()),
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    }),
    { defaultValue: [] }
  ),
});

export const createAlertRoute = (router: IRouter, licenseState: LicenseState) => {
  router.post(
    {
      path: `${BASE_ALERT_API_PATH}/alert`,
      validate: {
        body: bodySchema,
      },
      options: {
        tags: ['access:alerting-all'],
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(async function (
        context: RequestHandlerContext,
        req: KibanaRequest<unknown, unknown, TypeOf<typeof bodySchema>>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse> {
        verifyApiAccess(licenseState);

        if (!context.alerting) {
          return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
        }
        const alertsClient = context.alerting.getAlertsClient();
        const alert = req.body;
        const alertRes: Alert = await alertsClient.create({ data: alert });
        return res.ok({
          body: alertRes,
        });
      })
    )
  );
};
