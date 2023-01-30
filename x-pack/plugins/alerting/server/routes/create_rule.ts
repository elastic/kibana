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
  rewriteActionsReq,
  rewriteActionsRes,
  handleDisabledApiKeysError,
  verifyAccessAndContext,
  countUsageOfPredefinedIds,
  actionsSchema,
  rewriteRuleLastRun,
} from './lib';
import {
  SanitizedRule,
  validateNotifyWhenType,
  RuleTypeParams,
  BASE_ALERTING_API_PATH,
  RuleNotifyWhenType,
} from '../types';
import { RouteOptions } from '.';

export const bodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.maybe(schema.nullable(schema.string({ validate: validateDurationSchema }))),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  actions: actionsSchema,
  notify_when: schema.maybe(schema.nullable(schema.string({ validate: validateNotifyWhenType }))),
});

const rewriteBodyReq: RewriteRequestCase<CreateOptions<RuleTypeParams>['data']> = ({
  rule_type_id: alertTypeId,
  notify_when: notifyWhen,
  actions,
  ...rest
}) => ({
  ...rest,
  alertTypeId,
  notifyWhen,
  actions: rewriteActionsReq(actions),
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
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  snoozeSchedule,
  lastRun,
  nextRun,
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
  notify_when: notifyWhen,
  mute_all: muteAll,
  muted_alert_ids: mutedInstanceIds,
  execution_status: {
    ...executionStatus,
    last_execution_date: lastExecutionDate,
    last_duration: lastDuration,
  },
  actions: rewriteActionsRes(actions),
  ...(lastRun ? { last_run: rewriteRuleLastRun(lastRun) } : {}),
  ...(nextRun ? { next_run: nextRun } : {}),
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
                  notify_when: rule.notify_when as RuleNotifyWhenType,
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
