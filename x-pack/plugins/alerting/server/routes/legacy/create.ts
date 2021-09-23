/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
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
import { RouteOptions } from '..';
import { countUsageOfPredefinedIds } from '../lib';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

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

export const createAlertRoute = ({ router, licenseState, logger, usageCounter }: RouteOptions) => {
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
        trackLegacyRouteUsage('create', usageCounter);

        const spaceId = rulesClient.getSpaceId();
        const shouldWarnId = params?.id && spaceId !== undefined && spaceId !== 'default';
        if (shouldWarnId) {
          logger.warn(
            `POST ${LEGACY_BASE_ALERT_API_PATH}/alert/${params?.id}: Using the "id" path parameter to create rules in a custom space will lead to unexpected behavior in 8.0.0. Consult the Alerting API docs at https://www.elastic.co/guide/en/kibana/current/create-rule-api.html for more details.`
          );
        }

        countUsageOfPredefinedIds({
          predefinedId: params?.id,
          spaceId,
          usageCounter,
        });

        try {
          const alertRes: SanitizedAlert<AlertTypeParams> =
            await rulesClient.create<AlertTypeParams>({
              data: { ...alert, notifyWhen },
              options: { id: params?.id },
            });
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
