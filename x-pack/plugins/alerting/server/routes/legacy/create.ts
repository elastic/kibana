/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { RouteOptions } from '..';
import { LEGACY_BASE_ALERT_API_PATH } from '../../../common';
import type { AlertTypeParams, SanitizedAlert } from '../../../common/alert';
import type { AlertNotifyWhenType } from '../../../common/alert_notify_when_type';
import { validateNotifyWhenType } from '../../../common/alert_notify_when_type';
import { validateDurationSchema } from '../../../common/parse_duration';
import { AlertTypeDisabledError } from '../../lib/errors/alert_type_disabled';
import { verifyApiAccess } from '../../lib/license_api_access';
import { countUsageOfPredefinedIds } from '../lib/count_usage_of_predefined_ids';
import { handleDisabledApiKeysError } from '../lib/error_handler';

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

export const createAlertRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
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

        countUsageOfPredefinedIds({
          predefinedId: params?.id,
          spaceId: rulesClient.getSpaceId(),
          usageCounter,
        });

        try {
          const alertRes: SanitizedAlert<AlertTypeParams> = await rulesClient.create<AlertTypeParams>(
            {
              data: { ...alert, notifyWhen },
              options: { id: params?.id },
            }
          );
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
