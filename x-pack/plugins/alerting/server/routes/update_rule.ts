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
} from './lib';
import {
  RuleTypeParams,
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
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
  throttle: schema.nullable(schema.string({ validate: validateDurationSchema })),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
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

const rewriteBodyReq: RewriteRequestCase<UpdateOptions<RuleTypeParams>> = (result) => {
  const { actions, ...rest } = result.data;
  return {
    ...result,
    data: {
      ...rest,
      actions: actions.map((action) => ({
        ...action,
        isSummary: action.is_summary,
        summaryOf: action.summary_of,
        notifyWhen: action.notify_when,
        actionThrottle: action.action_throttle,
        actionThrottleUnit: action.action_throttle_unit,
      })),
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
  muteAll,
  mutedInstanceIds,
  executionStatus,
  snoozeSchedule,
  isSnoozedUntil,
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
      }
    : {}),
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
            const alertRes = await rulesClient.update(
              rewriteBodyReq({
                id,
                // @ts-ignore
                data: rule,
              })
            );
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
