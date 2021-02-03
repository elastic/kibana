/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import type { AlertingRouter } from '../types';
import { ILicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { validateDurationSchema } from '../lib';
import { handleDisabledApiKeysError } from './lib/error_handler';
import {
  Alert,
  AlertNotifyWhenType,
  AlertTypeParams,
  BASE_ALERT_API_PATH,
  validateNotifyWhenType,
} from '../types';
import { AlertTypeDisabledError } from '../lib/errors/alert_type_disabled';

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
  notifyWhen: schema.nullable(schema.string({ validate: validateNotifyWhenType })),
});

export const createAlertRoute = (router: AlertingRouter, licenseState: ILicenseState) => {
  router.post(
    {
      path: `${BASE_ALERT_API_PATH}/alert/{id?}`,
      validate: {
        params: schema.maybe(
          schema.object({
            id: schema.maybe(schema.string()),
          })
        ),
        body: bodySchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(async function (context, req, res) {
        verifyApiAccess(licenseState);

        if (!context.alerting) {
          return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
        }
        const alertsClient = context.alerting.getAlertsClient();
        const alert = req.body;
        const params = req.params;
        const notifyWhen = alert?.notifyWhen ? (alert.notifyWhen as AlertNotifyWhenType) : null;
        try {
          const alertRes: Alert<AlertTypeParams> = await alertsClient.create<AlertTypeParams>({
            data: { ...alert, notifyWhen },
            options: { id: params?.id },
          });
          return res.ok({
            body: alertRes,
          });
        } catch (e) {
          if (e instanceof AlertTypeDisabledError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
