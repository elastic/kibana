/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';
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
} from '../types';
import { RouteOptions } from '.';

export const bodySchema = z.object({
  name: z.string(),
  rule_type_id: z.string(),
  enabled: z.boolean().default(true),
  consumer: z.string(),
  tags: z.array(z.string()).default([]),
  throttle: z.optional(z.nullable(z.string().superRefine(validateDurationSchema))),
  params: z.record(z.string(), z.any()).default({}),
  schedule: z.object({
    interval: z.string().superRefine(validateDurationSchema),
  }),
  actions: actionsSchema,
  notify_when: z.optional(
    z.nullable(
      z
        .union([
          z.literal('onActionGroupChange'),
          z.literal('onActiveAlert'),
          z.literal('onThrottleInterval'),
        ])
        .superRefine(validateNotifyWhenType)
    )
  ),
});

const rewriteBodyReq: RewriteRequestCase<CreateOptions<RuleTypeParams>['data']> = ({
  rule_type_id: alertTypeId,
  notify_when: notifyWhen,
  actions,
  ...rest
}): CreateOptions<RuleTypeParams>['data'] => ({
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
  apiKeyCreatedByUser,
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
  ...(apiKeyCreatedByUser !== undefined ? { api_key_created_by_user: apiKeyCreatedByUser } : {}),
});

export const createRuleRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id?}`,
      validate: {
        params: z.optional(
          z.object({
            id: z.optional(z.string()),
          })
        ),
        body: bodySchema,
      },
      options: {
        isZod: true,
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
                data: rewriteBodyReq(rule),
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
