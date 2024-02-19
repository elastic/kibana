/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
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
  actionsSchema,
  rewriteRuleLastRun,
} from './lib';
import {
  RuleTypeParams,
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  validateNotifyWhenType,
  PartialRule,
} from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  name: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  throttle: schema.nullable(schema.maybe(schema.string({ validate: validateDurationSchema }))),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  actions: actionsSchema,
  notify_when: schema.maybe(
    schema.nullable(
      schema.oneOf(
        [
          schema.literal('onActionGroupChange'),
          schema.literal('onActiveAlert'),
          schema.literal('onThrottleInterval'),
        ],
        { validate: validateNotifyWhenType }
      )
    )
  ),
  alert_delay: schema.maybe(
    schema.object({
      active: schema.number(),
    })
  ),
});

const rewriteBodyReq: RewriteRequestCase<UpdateOptions<RuleTypeParams>> = (result) => {
  const { notify_when: notifyWhen, alert_delay: alertDelay, actions, ...rest } = result.data;
  return {
    ...result,
    data: {
      ...rest,
      notifyWhen,
      actions: rewriteActionsReq(actions),
      alertDelay,
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
  alertDelay,
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
  ...(alertDelay ? { alert_delay: alertDelay } : {}),
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
