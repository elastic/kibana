/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RuleExecutionStatus } from '@kbn/alerting-plugin/common';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import type { Rule, RuleAction, ResolvedRule, RuleLastRun } from '../../../types';
import { isSystemAction } from '../is_system_action';

const transformAction: RewriteRequestCase<RuleAction> = (action) => {
  if (isSystemAction(action)) {
    return { ...action, actionTypeId: action.connector_type_id };
  }

  return {
    group: action.group,
    id: action.id,
    params: action.params,
    actionTypeId: action.connector_type_id,
    ...(action.frequency
      ? {
          frequency: {
            summary: action.frequency.summary,
            notifyWhen: action.frequency.notify_when,
            throttle: action.frequency.throttle,
          },
        }
      : {}),
    ...(action.alerts_filter ? { alertsFilter: action.alerts_filter } : {}),
    ...(action.uuid && { uuid: action.uuid }),
  };
};

const transformExecutionStatus: RewriteRequestCase<RuleExecutionStatus> = ({
  last_execution_date: lastExecutionDate,
  last_duration: lastDuration,
  ...rest
}) => ({
  lastExecutionDate,
  lastDuration,
  ...rest,
});

const transformLastRun: RewriteRequestCase<RuleLastRun> = ({
  outcome_msg: outcomeMsg,
  outcome_order: outcomeOrder,
  alerts_count: alertsCount,
  ...rest
}) => ({
  outcomeMsg,
  outcomeOrder,
  alertsCount,
  ...rest,
});

export const transformRule: RewriteRequestCase<Rule> = ({
  rule_type_id: ruleTypeId,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  api_key_owner: apiKeyOwner,
  api_key_created_by_user: apiKeyCreatedByUser,
  notify_when: notifyWhen,
  mute_all: muteAll,
  muted_alert_ids: mutedInstanceIds,
  scheduled_task_id: scheduledTaskId,
  execution_status: executionStatus,
  actions: actions,
  snooze_schedule: snoozeSchedule,
  is_snoozed_until: isSnoozedUntil,
  active_snoozes: activeSnoozes,
  last_run: lastRun,
  next_run: nextRun,
  ...rest
}: any) => ({
  ruleTypeId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  snoozeSchedule,
  executionStatus: executionStatus ? transformExecutionStatus(executionStatus) : undefined,
  actions: actions
    ? actions.map((action: AsApiContract<RuleAction>) => transformAction(action))
    : [],
  scheduledTaskId,
  isSnoozedUntil,
  activeSnoozes,
  ...(lastRun ? { lastRun: transformLastRun(lastRun) } : {}),
  ...(nextRun ? { nextRun } : {}),
  ...(apiKeyCreatedByUser !== undefined ? { apiKeyCreatedByUser } : {}),
  ...rest,
});

export const transformResolvedRule: RewriteRequestCase<ResolvedRule> = ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  alias_target_id,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  alias_purpose,
  outcome,
  ...rest
}: any) => {
  return {
    ...transformRule(rest),
    alias_target_id,
    alias_purpose,
    outcome,
  };
};
