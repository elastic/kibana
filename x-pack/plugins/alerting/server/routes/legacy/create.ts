/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { verifyApiAccess } from '../../lib/license_api_access';
import { validateDurationSchema } from '../../lib';
import { handleDisabledApiKeysError } from '../lib/error_handler';
import {
  SanitizedRule,
  RuleTypeParams,
  LEGACY_BASE_ALERT_API_PATH,
  SummaryOf,
  NotifyWhen,
  ThrottleUnit,
} from '../../types';
import { RuleTypeDisabledError } from '../../lib/errors/rule_type_disabled';
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
      is_summary: schema.boolean(),
      summary_of: schema.nullable(schema.string()),
      action_throttle: schema.nullable(schema.number()),
      action_throttle_unit: schema.nullable(schema.string()),
      notify_when: schema.string(),
      last_trigger_date: schema.nullable(schema.string()),
    }),
    { defaultValue: [] }
  ),
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
        const rulesClient = (await context.alerting).getRulesClient();
        const alert = req.body;
        const params = req.params;

        trackLegacyRouteUsage('create', usageCounter);

        countUsageOfPredefinedIds({
          predefinedId: params?.id,
          spaceId: rulesClient.getSpaceId(),
          usageCounter,
        });

        try {
          const alertRes: SanitizedRule<RuleTypeParams> = await rulesClient.create<RuleTypeParams>({
            data: {
              ...alert,
              actions: alert.actions.map((act) => {
                return {
                  group: act.group,
                  params: act.params,
                  id: act.id,
                  isSummary: act.is_summary as boolean,
                  summaryOf: act.summary_of as SummaryOf,
                  notifyWhen: act.notify_when as NotifyWhen,
                  actionThrottle: act.action_throttle as number,
                  actionThrottleUnit: act.action_throttle_unit as ThrottleUnit,
                  lastTriggerDate: act.last_trigger_date as string,
                };
              }),
            },
            options: { id: params?.id },
          });
          return res.ok({
            body: alertRes,
          });
        } catch (e) {
          if (e instanceof RuleTypeDisabledError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
