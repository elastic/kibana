/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import { PartialRule } from '../..';
import { RuleTypeParams, SanitizedRule, RuleLastRun } from '../../types';
import { rewriteActionsRes } from './rewrite_actions';

export const rewriteRuleLastRun = (lastRun: RuleLastRun) => {
  const { outcomeMsg, outcomeOrder, alertsCount, ...rest } = lastRun;
  return {
    alerts_count: alertsCount,
    outcome_msg: outcomeMsg,
    outcome_order: outcomeOrder,
    ...rest,
  };
};

export const rewriteRule = ({
  alertTypeId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  executionStatus,
  actions,
  scheduledTaskId,
  snoozeSchedule,
  isSnoozedUntil,
  activeSnoozes,
  lastRun,
  nextRun,
  ...rest
}: SanitizedRule<RuleTypeParams> & { activeSnoozes?: string[] }) => ({
  ...rest,
  rule_type_id: alertTypeId,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  api_key_owner: apiKeyOwner,
  notify_when: notifyWhen,
  mute_all: muteAll,
  muted_alert_ids: mutedInstanceIds,
  scheduled_task_id: scheduledTaskId,
  snooze_schedule: snoozeSchedule,
  ...(isSnoozedUntil != null ? { is_snoozed_until: isSnoozedUntil } : {}),
  ...(activeSnoozes != null ? { active_snoozes: activeSnoozes } : {}),
  execution_status: executionStatus && {
    ...omit(executionStatus, 'lastExecutionDate', 'lastDuration'),
    last_execution_date: executionStatus.lastExecutionDate,
    last_duration: executionStatus.lastDuration,
  },
  actions: rewriteActionsRes(actions),
  ...(lastRun ? { last_run: rewriteRuleLastRun(lastRun) } : {}),
  ...(nextRun ? { next_run: nextRun } : {}),
});

export const rewritePartialRule = (rule: PartialRule<RuleTypeParams>) => {
  const rewrittenRule = rewriteRule(rule as SanitizedRule);
  return Object.entries(rewrittenRule).reduce((result, [key, val]) => {
    if (val) return { ...result, [key]: val };
    return result;
  }, {}) as PartialRule<RuleTypeParams>;
};
