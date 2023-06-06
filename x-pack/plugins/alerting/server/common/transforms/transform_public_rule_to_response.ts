/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PublicRule, RuleLastRun } from '../types';
import { RuleParams, PublicRuleResponse } from '../../../common/types/api';

const transformRuleLastRun = (lastRun: RuleLastRun): PublicRuleResponse['last_run'] => {
  return {
    outcome: lastRun.outcome,
    outcome_order: lastRun.outcomeOrder,
    ...(lastRun.warning ? { warning: lastRun.warning } : {}),
    alerts_count: lastRun.alertsCount,
    outcome_msg: lastRun.outcomeMsg,
  };
};

export const transformPublicRuleToResponse = <Params extends RuleParams = never>(
  rule: PublicRule<Params>
): PublicRuleResponse<Params> => ({
  id: rule.id,
  enabled: rule.enabled,
  name: rule.name,
  tags: rule.tags,
  rule_type_id: rule.alertTypeId,
  consumer: rule.consumer,
  schedule: rule.schedule,
  actions: rule.actions.map(
    ({ group, id, actionTypeId, params, frequency, uuid, alertsFilter }) => ({
      group,
      id,
      params,
      connector_type_id: actionTypeId,
      ...(frequency
        ? {
            frequency: {
              summary: frequency.summary,
              notify_when: frequency.notifyWhen,
              throttle: frequency.throttle,
            },
          }
        : {}),
      ...(uuid && { uuid }),
      ...(alertsFilter && { alerts_filter: alertsFilter }),
    })
  ),
  params: rule.params,
  created_by: rule.createdBy,
  updated_by: rule.updatedBy,
  created_at: rule.createdAt,
  updated_at: rule.updatedAt,
  api_key_owner: rule.apiKeyOwner,
  ...(rule.apiKeyCreatedByUser !== undefined
    ? { api_key_created_by_user: rule.apiKeyCreatedByUser }
    : {}),
  notify_when: rule.notifyWhen,
  mute_all: rule.muteAll,
  muted_alert_ids: rule.mutedInstanceIds,
  scheduled_task_id: rule.scheduledTaskId,
  ...(rule.isSnoozedUntil != null ? { is_snoozed_until: rule.isSnoozedUntil } : {}),
  execution_status: {
    status: rule.executionStatus.status,
    ...(rule.executionStatus.error ? { error: rule.executionStatus.error } : {}),
    ...(rule.executionStatus.warning ? { warning: rule.executionStatus.warning } : {}),
    last_execution_date: rule.executionStatus.lastExecutionDate,
    last_duration: rule.executionStatus.lastDuration,
  },
  ...(rule.lastRun ? { last_run: transformRuleLastRun(rule.lastRun) } : {}),
  ...(rule.nextRun ? { next_run: rule.nextRun } : {}),
  revision: rule.revision,
});
