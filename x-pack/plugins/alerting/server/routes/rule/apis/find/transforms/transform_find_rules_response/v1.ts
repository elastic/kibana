/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesResponseV1 } from '../../../../../schemas/rule/apis/find';
import type { RuleResponseV1, RuleParamsV1 } from '../../../../../schemas/rule/response';
import type { FindResult } from '../../../../../../application/rule/methods/find';
import { Rule, RuleParams } from '../../../../../../application/rule/types';
import {
  transformRuleActionsV1,
  transformMonitoringV1,
  transformRuleLastRunV1,
} from '../../../../transforms';

export const transformPartialRule = <Params extends RuleParams = never>(
  rule: Partial<Rule<Params>>,
  fields?: string[]
): Partial<RuleResponseV1<RuleParamsV1>> => {
  const ruleResponse = {
    ...(rule.id !== undefined ? { id: rule.id } : {}),
    ...(rule.enabled !== undefined ? { enabled: rule.enabled } : {}),
    ...(rule.name !== undefined ? { name: rule.name } : {}),
    ...(rule.tags ? { tags: rule.tags } : {}),
    ...(rule.alertTypeId !== undefined ? { rule_type_id: rule.alertTypeId } : {}),
    ...(rule.consumer !== undefined ? { consumer: rule.consumer } : {}),
    ...(rule.schedule ? { schedule: rule.schedule } : {}),
    ...(rule.actions || rule.systemActions
      ? { actions: transformRuleActionsV1(rule.actions || [], rule.systemActions || []) }
      : {}),
    ...(rule.params ? { params: rule.params } : {}),
    ...(rule.mapped_params ? { mapped_params: rule.mapped_params } : {}),
    ...(rule.scheduledTaskId !== undefined ? { scheduled_task_id: rule.scheduledTaskId } : {}),
    ...(rule.createdBy !== undefined ? { created_by: rule.createdBy } : {}),
    ...(rule.updatedBy !== undefined ? { updated_by: rule.updatedBy } : {}),
    ...(rule.createdAt ? { created_at: rule.createdAt.toISOString() } : {}),
    ...(rule.updatedAt ? { updated_at: rule.updatedAt.toISOString() } : {}),
    ...(rule.apiKeyOwner !== undefined ? { api_key_owner: rule.apiKeyOwner } : {}),
    ...(rule.apiKeyCreatedByUser !== undefined
      ? { api_key_created_by_user: rule.apiKeyCreatedByUser }
      : {}),
    ...(rule.throttle !== undefined ? { throttle: rule.throttle } : {}),
    ...(rule.muteAll !== undefined ? { mute_all: rule.muteAll } : {}),
    ...(rule.notifyWhen !== undefined ? { notify_when: rule.notifyWhen } : {}),
    ...(rule.mutedInstanceIds ? { muted_alert_ids: rule.mutedInstanceIds } : {}),
    ...(rule.scheduledTaskId !== undefined ? { scheduled_task_id: rule.scheduledTaskId } : {}),
    ...(rule.executionStatus
      ? {
          execution_status: {
            status: rule.executionStatus.status,
            ...(rule.executionStatus.error ? { error: rule.executionStatus.error } : {}),
            ...(rule.executionStatus.warning ? { warning: rule.executionStatus.warning } : {}),
            last_execution_date: rule.executionStatus.lastExecutionDate?.toISOString(),
            ...(rule.executionStatus.lastDuration !== undefined
              ? { last_duration: rule.executionStatus.lastDuration }
              : {}),
          },
        }
      : {}),
    ...(rule.monitoring ? { monitoring: transformMonitoringV1(rule.monitoring) } : {}),
    ...(rule.snoozeSchedule ? { snooze_schedule: rule.snoozeSchedule } : {}),
    ...(rule.activeSnoozes ? { active_snoozes: rule.activeSnoozes } : {}),
    ...(rule.isSnoozedUntil !== undefined
      ? { is_snoozed_until: rule.isSnoozedUntil?.toISOString() || null }
      : {}),
    ...(rule.lastRun !== undefined
      ? { last_run: rule.lastRun ? transformRuleLastRunV1(rule.lastRun) : null }
      : {}),
    ...(rule.nextRun !== undefined ? { next_run: rule.nextRun?.toISOString() || null } : {}),
    ...(rule.revision !== undefined ? { revision: rule.revision } : {}),
    ...(rule.running !== undefined ? { running: rule.running } : {}),
    ...(rule.viewInAppRelativeUrl !== undefined
      ? { view_in_app_relative_url: rule.viewInAppRelativeUrl }
      : {}),
    ...(rule.alertDelay !== undefined ? { alert_delay: rule.alertDelay } : {}),
  };

  type RuleKeys = keyof RuleResponseV1<RuleParamsV1>;
  for (const key in ruleResponse) {
    if (ruleResponse[key as RuleKeys] !== undefined) {
      continue;
    }
    if (!fields) {
      continue;
    }
    if (fields.includes(key)) {
      continue;
    }
    delete ruleResponse[key as RuleKeys];
  }
  return ruleResponse;
};

export const transformFindRulesResponse = <Params extends RuleParams = never>(
  result: FindResult<Params>,
  fields?: string[]
): FindRulesResponseV1<RuleParamsV1>['body'] => {
  return {
    page: result.page,
    per_page: result.perPage,
    total: result.total,
    data: result.data.map((rule) =>
      transformPartialRule<RuleParamsV1>(rule as Partial<Rule<Params>>, fields)
    ),
  };
};
