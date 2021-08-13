/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import type { AlertingRouter } from '../../types';
import { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/license_api_access';
import { validateDurationSchema } from '../../lib';
import { handleDisabledApiKeysError } from './../lib/error_handler';
import {
  SanitizedAlert,
  AlertNotifyWhenType,
  AlertTypeParams,
  LEGACY_BASE_ALERT_API_PATH,
  validateNotifyWhenType,
} from '../../types';
import { AlertTypeDisabledError } from '../../lib/errors/alert_type_disabled';

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

export const createAlertRoute = (
  router: AlertingRouter,
  licenseState: ILicenseState,
  logger: Logger
) => {
  router.post(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/alert/{id?}`,
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
        const rulesClient = context.alerting.getRulesClient();
        const alert = req.body;
        const params = req.params;
        const notifyWhen = alert?.notifyWhen ? (alert.notifyWhen as AlertNotifyWhenType) : null;

        const shouldWarnId = params?.id && rulesClient.getSpaceId();
        if (shouldWarnId) {
          logger.warn(
            `POST ${LEGACY_BASE_ALERT_API_PATH}/alert/${params?.id}: Using the "id" path parameter to create rules in a custom space will lead to unexpected behavior in 8.0.0. Consult the Alerting API docs at https://www.elastic.co/guide/en/kibana/current/create-rule-api.html for more details.`
          );
        }

        try {
          const alertRes: SanitizedAlert<AlertTypeParams> = await rulesClient.create<AlertTypeParams>(
            {
              data: { ...alert, notifyWhen },
              options: { id: params?.id },
            }
          );
          return res.ok({
            body: alertRes,
            ...(shouldWarnId
              ? {
                  headers: {
                    warning: `199 kibana "Using the "id" path parameter to create rules in a custom space will lead to unexpected behavior in 8.0.0. Consult the Alerting API docs at https://www.elastic.co/guide/en/kibana/current/create-rule-api.html for more details."`,
                  },
                }
              : {}),
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
