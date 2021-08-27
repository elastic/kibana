/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { LEGACY_BASE_ALERT_API_PATH } from '../../../common';
import type { AlertNotifyWhenType } from '../../../common/alert_notify_when_type';
import { validateNotifyWhenType } from '../../../common/alert_notify_when_type';
import { validateDurationSchema } from '../../../common/parse_duration';
import { AlertTypeDisabledError } from '../../lib/errors/alert_type_disabled';
import { verifyApiAccess } from '../../lib/license_api_access';
import type { ILicenseState } from '../../lib/license_state';
import type { AlertingRouter } from '../../types';
import { handleDisabledApiKeysError } from '../lib/error_handler';

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  name: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  throttle: schema.nullable(schema.string({ validate: validateDurationSchema })),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  actions: schema.arrayOf(
    schema.object({
      group: schema.string(),
      id: schema.string(),
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
      actionTypeId: schema.maybe(schema.string()),
    }),
    { defaultValue: [] }
  ),
  notifyWhen: schema.nullable(schema.string({ validate: validateNotifyWhenType })),
});

export const updateAlertRoute = (router: AlertingRouter, licenseState: ILicenseState) => {
  router.put(
    {
      path: `${LEGACY_BASE_ALERT_API_PATH}/alert/{id}`,
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(async function (context, req, res) {
        verifyApiAccess(licenseState);
        if (!context.alerting) {
          return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
        }
        const rulesClient = context.alerting.getRulesClient();
        const { id } = req.params;
        const { name, actions, params, schedule, tags, throttle, notifyWhen } = req.body;
        try {
          const alertRes = await rulesClient.update({
            id,
            data: {
              name,
              actions,
              params,
              schedule,
              tags,
              throttle,
              notifyWhen: notifyWhen as AlertNotifyWhenType,
            },
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
