/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AlertingRouter } from '../types';
import { ILicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { validateDurationSchema } from '../lib';
import { handleDisabledApiKeysError } from './lib/error_handler';
import { AlertNotifyWhenType, BASE_ALERT_API_PATH, validateNotifyWhenType } from '../../common';
import { AlertTypeDisabledError } from '../lib/errors/alert_type_disabled';

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
      path: `${BASE_ALERT_API_PATH}/alert/{id}`,
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
        const alertsClient = context.alerting.getAlertsClient();
        const { id } = req.params;
        const { name, actions, params, schedule, tags, throttle, notifyWhen } = req.body;
        try {
          const alertRes = await alertsClient.update({
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
