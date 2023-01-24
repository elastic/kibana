/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { ILicenseState, RuleTypeDisabledError } from '../lib';
import {
  verifyAccessAndContext,
  RewriteResponseCase,
  handleDisabledApiKeysError,
  rewriteRuleLastRun,
} from './lib';
import {
  RuleTypeParams,
  AlertingRequestHandlerContext,
  INTERNAL_BASE_ALERTING_API_PATH,
  PartialRule,
} from '../types';

const paramSchema = schema.object({
  id: schema.string(),
  newId: schema.maybe(schema.string()),
});

const rewriteBodyRes: RewriteResponseCase<PartialRule<RuleTypeParams>> = ({
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
        actions: actions.map(({ group, id, actionTypeId, params, frequency }) => ({
          group,
          id,
          params,
          connector_type_id: actionTypeId,
          frequency,
        })),
      }
    : {}),
  ...(lastRun ? { last_run: rewriteRuleLastRun(lastRun) } : {}),
  ...(nextRun ? { next_run: nextRun } : {}),
});

export const cloneRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_clone/{newId?}`,
      validate: {
        params: paramSchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const { id, newId } = req.params;
          try {
            const cloneRule = await rulesClient.clone(id, { newId });
            return res.ok({
              body: rewriteBodyRes(cloneRule),
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
