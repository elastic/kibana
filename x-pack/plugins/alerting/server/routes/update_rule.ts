/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { IRouter } from '@kbn/core/server';
import { ILicenseState, RuleTypeDisabledError, validateDurationSchema } from '../lib';
import { UpdateOptions } from '../rules_client';
import {
  verifyAccessAndContext,
  RewriteResponseCase,
  RewriteRequestCase,
  handleDisabledApiKeysError,
  rewriteActionsReq,
  rewriteActionsRes,
  rewriteRuleLastRun,
} from './lib';
import {
  RuleTypeParams,
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  validateNotifyWhenType,
  PartialRule,
} from '../types';
import { validateHours } from './lib/validate_hours';
import { validateTimezone } from './lib/validate_timezone';

const paramSchema = z.object({
  id: z.string(),
});

const bodySchema = z.object({
  name: z.string({ description: 'The name of the rule.' }),
  tags: z.array(z.string()),
  schedule: z.object({
    interval: z.string().superRefine(validateDurationSchema),
  }),
  throttle: z.nullable(z.optional(z.string().superRefine(validateDurationSchema))),
  params: z.record(z.string(), z.any()),
  actions: z.array(
    z.object({
      group: z.string(),
      id: z.string(),
      frequency: z.optional(
        z.object({
          summary: z.boolean(),
          notify_when: z.enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval']),
          throttle: z.nullable(z.string().superRefine(validateDurationSchema)),
        })
      ),
      params: z.record(z.string(), z.any()),
      uuid: z.optional(z.string()),
      alerts_filter: z.optional(
        z.object({
          query: z.optional(
            z.object({
              kql: z.string(),
              filters: z.array(
                z.object({
                  query: z.optional(z.record(z.string(), z.any())),
                  meta: z.record(z.string(), z.any()),
                  state$: z.optional(z.object({ store: z.string() })),
                })
              ),
              dsl: z.optional(z.string()),
            })
          ),
          timeframe: z.optional(
            z.object({
              days: z.array(
                z.union([
                  z.literal(1),
                  z.literal(2),
                  z.literal(3),
                  z.literal(4),
                  z.literal(5),
                  z.literal(6),
                  z.literal(7),
                ])
              ),
              hours: z.object({
                start: z.string().superRefine(validateHours),
                end: z.string().superRefine(validateHours),
              }),
              timezone: z.string().superRefine(validateTimezone),
            })
          ),
        })
      ),
    })
  ),
  notify_when: z.optional(
    z.nullable(
      z
        .enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval'])
        .refine(validateNotifyWhenType)
    )
  ),
});

const rewriteBodyReq: RewriteRequestCase<UpdateOptions<RuleTypeParams>> = (result) => {
  const { notify_when: notifyWhen, actions, ...rest } = result.data;
  return {
    ...result,
    data: {
      ...rest,
      notifyWhen,
      actions: rewriteActionsReq(actions),
    },
  };
};
const rewriteBodyRes: RewriteResponseCase<PartialRule<RuleTypeParams>> = ({
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
  executionStatus,
  snoozeSchedule,
  isSnoozedUntil,
  lastRun,
  nextRun,
  ...rest
}) => ({
  ...rest,
  api_key_owner: apiKeyOwner,
  created_by: createdBy,
  updated_by: updatedBy,
  snooze_schedule: snoozeSchedule,
  ...(isSnoozedUntil ? { is_snoozed_until: isSnoozedUntil } : {}),
  ...(alertTypeId ? { rule_type_id: alertTypeId } : {}),
  ...(scheduledTaskId ? { scheduled_task_id: scheduledTaskId } : {}),
  ...(createdAt ? { created_at: createdAt } : {}),
  ...(updatedAt ? { updated_at: updatedAt } : {}),
  ...(notifyWhen ? { notify_when: notifyWhen } : {}),
  ...(muteAll !== undefined ? { mute_all: muteAll } : {}),
  ...(mutedInstanceIds ? { muted_alert_ids: mutedInstanceIds } : {}),
  ...(executionStatus
    ? {
        execution_status: {
          status: executionStatus.status,
          last_execution_date: executionStatus.lastExecutionDate,
          last_duration: executionStatus.lastDuration,
        },
      }
    : {}),
  ...(actions
    ? {
        actions: rewriteActionsRes(actions),
      }
    : {}),
  ...(lastRun ? { last_run: rewriteRuleLastRun(lastRun) } : {}),
  ...(nextRun ? { next_run: nextRun } : {}),
  ...(apiKeyCreatedByUser !== undefined ? { api_key_created_by_user: apiKeyCreatedByUser } : {}),
});

export const updateRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
      options: {
        isZod: true,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const { id } = req.params;
          const rule = req.body;
          try {
            const alertRes = await rulesClient.update(rewriteBodyReq({ id, data: rule }));
            return res.ok({
              body: rewriteBodyRes(alertRes),
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
