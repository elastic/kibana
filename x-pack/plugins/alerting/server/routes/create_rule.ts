/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationSchema, RuleTypeDisabledError } from '../lib';
import { CreateOptions } from '../rules_client';
import {
  RewriteRequestCase,
  RewriteResponseCase,
  handleDisabledApiKeysError,
  verifyAccessAndContext,
  countUsageOfPredefinedIds,
} from './lib';
import {
  SanitizedRule,
  RuleTypeParams,
  BASE_ALERTING_API_PATH,
  SummaryOf,
  NotifyWhen,
  ThrottleUnit,
} from '../types';
import { RouteOptions } from '.';

export const bodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
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
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
      is_summary: schema.boolean(),
      summary_of: schema.string(),
      action_throttle: schema.number(),
      action_throttle_unit: schema.string(),
      notify_when: schema.string(),
    }),
    { defaultValue: [] }
  ),
});

const rewriteBodyReq: RewriteRequestCase<CreateOptions<RuleTypeParams>['data']> = ({
  rule_type_id: alertTypeId,
  actions,
  ...rest
}) => ({
  ...rest,
  alertTypeId,
  actions: actions.map((action) => ({
    group: action.group,
    id: action.id,
    params: action.params,
    isSummary: action.is_summary,
    summaryOf: action.summary_of,
    notifyWhen: action.notify_when,
    actionThrottle: action.action_throttle,
    actionThrottleUnit: action.action_throttle_unit,
  })),
});
const rewriteBodyRes: RewriteResponseCase<SanitizedRule<RuleTypeParams>> = ({
  actions,
  alertTypeId,
  scheduledTaskId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  muteAll,
  mutedInstanceIds,
  snoozeSchedule,
  executionStatus: { lastExecutionDate, lastDuration, ...executionStatus },
  ...rest
}) => ({
  ...rest,
  rule_type_id: alertTypeId,
  scheduled_task_id: scheduledTaskId,
  snooze_schedule: snoozeSchedule,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  api_key_owner: apiKeyOwner,
  mute_all: muteAll,
  muted_alert_ids: mutedInstanceIds,
  execution_status: {
    ...executionStatus,
    last_execution_date: lastExecutionDate,
    last_duration: lastDuration,
  },
  actions: actions.map(
    ({
      group,
      id,
      actionTypeId,
      params,
      isSummary,
      summaryOf,
      actionThrottle,
      actionThrottleUnit,
      notifyWhen,
    }) => ({
      group,
      id,
      params,
      connector_type_id: actionTypeId,
      is_summary: isSummary,
      summary_of: summaryOf,
      action_throttle: actionThrottle,
      action_throttle_unit: actionThrottleUnit,
      notify_when: notifyWhen,
    })
  ),
});

export const createRuleRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id?}`,
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
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const rule = req.body;
          const params = req.params;

          countUsageOfPredefinedIds({
            predefinedId: params?.id,
            spaceId: rulesClient.getSpaceId(),
            usageCounter,
          });

          try {
            const createdRule: SanitizedRule<RuleTypeParams> =
              await rulesClient.create<RuleTypeParams>({
                data: rewriteBodyReq({
                  ...rule,
                  actions: rule.actions.map((act) => {
                    return {
                      group: act.group,
                      params: act.params,
                      id: act.id,
                      is_summary: act.is_summary as boolean,
                      summary_of: act.summary_of as SummaryOf,
                      notify_when: act.notify_when as NotifyWhen,
                      action_throttle: act.action_throttle as number,
                      action_throttle_unit: act.action_throttle_unit as ThrottleUnit,
                    };
                  }),
                }),
                options: { id: params?.id },
              });
            return res.ok({
              body: rewriteBodyRes(createdRule),
            });
          } catch (e) {
            if (e instanceof RuleTypeDisabledError) {
              return e.sendResponse(res);
            }
            throw e;
          }
        })
      )
    )
  );
};
