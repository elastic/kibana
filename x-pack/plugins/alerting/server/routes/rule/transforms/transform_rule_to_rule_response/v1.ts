/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleResponseV1,
  RuleParamsV1,
  RuleLastRunV1,
  MonitoringV1,
} from '../../../schemas/rule/response';
import { Rule, RuleLastRun, RuleParams, Monitoring } from '../../../../application/rule/types';

export const transformRuleLastRun = (lastRun: RuleLastRun): RuleLastRunV1 => {
  return {
    outcome: lastRun.outcome,
    ...(lastRun.outcomeOrder !== undefined ? { outcome_order: lastRun.outcomeOrder } : {}),
    ...(lastRun.warning !== undefined ? { warning: lastRun.warning } : {}),
    ...(lastRun.outcomeMsg !== undefined ? { outcome_msg: lastRun.outcomeMsg } : {}),
    alerts_count: lastRun.alertsCount,
  };
};

export const transformMonitoring = (monitoring: Monitoring): MonitoringV1 => {
  return {
    run: {
      history: monitoring.run.history.map((history) => ({
        success: history.success,
        timestamp: history.timestamp,
        ...(history.duration !== undefined ? { duration: history.duration } : {}),
        ...(history.outcome ? { outcome: transformRuleLastRun(history.outcome) } : {}),
      })),
      calculated_metrics: monitoring.run.calculated_metrics,
      last_run: monitoring.run.last_run,
    },
  };
};

export const transformRuleActions = (
  actions: Rule['actions'] = [],
  systemActions: Rule['systemActions'] = []
): RuleResponseV1['actions'] => {
  return [
    ...actions.map((action) => {
      const {
        group,
        id,
        actionTypeId,
        params,
        frequency,
        uuid,
        alertsFilter,
        useAlertDataForTemplate,
      } = action;

      return {
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
        ...(useAlertDataForTemplate !== undefined && {
          use_alert_data_for_template: useAlertDataForTemplate,
        }),
      };
    }),
    ...systemActions.map((sActions) => {
      const { id, actionTypeId, params, uuid } = sActions;
      return {
        id,
        params,
        uuid,
        connector_type_id: actionTypeId,
      };
    }),
  ];
};

export const transformRuleToRuleResponse = <Params extends RuleParams = never>(
  rule: Rule<Params>
): RuleResponseV1<RuleParamsV1> => ({
  id: rule.id,
  enabled: rule.enabled,
  name: rule.name,
  tags: rule.tags,
  rule_type_id: rule.alertTypeId,
  consumer: rule.consumer,
  schedule: rule.schedule,
  actions: transformRuleActions(rule.actions, rule.systemActions ?? []),
  params: rule.params,
  ...(rule.mapped_params ? { mapped_params: rule.mapped_params } : {}),
  ...(rule.scheduledTaskId !== undefined ? { scheduled_task_id: rule.scheduledTaskId } : {}),
  created_by: rule.createdBy,
  updated_by: rule.updatedBy,
  created_at: rule.createdAt.toISOString(),
  updated_at: rule.updatedAt.toISOString(),
  api_key_owner: rule.apiKeyOwner,
  ...(rule.apiKeyCreatedByUser !== undefined
    ? { api_key_created_by_user: rule.apiKeyCreatedByUser }
    : {}),
  ...(rule.throttle !== undefined ? { throttle: rule.throttle } : {}),
  mute_all: rule.muteAll,
  ...(rule.notifyWhen !== undefined ? { notify_when: rule.notifyWhen } : {}),
  muted_alert_ids: rule.mutedInstanceIds,
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
  ...(rule.monitoring ? { monitoring: transformMonitoring(rule.monitoring) } : {}),
  ...(rule.snoozeSchedule ? { snooze_schedule: rule.snoozeSchedule } : {}),
  ...(rule.activeSnoozes ? { active_snoozes: rule.activeSnoozes } : {}),
  ...(rule.isSnoozedUntil !== undefined
    ? { is_snoozed_until: rule.isSnoozedUntil?.toISOString() || null }
    : {}),
  ...(rule.lastRun !== undefined
    ? { last_run: rule.lastRun ? transformRuleLastRun(rule.lastRun) : null }
    : {}),
  ...(rule.nextRun !== undefined ? { next_run: rule.nextRun?.toISOString() || null } : {}),
  revision: rule.revision,
  ...(rule.running !== undefined ? { running: rule.running } : {}),
  ...(rule.viewInAppRelativeUrl !== undefined
    ? { view_in_app_relative_url: rule.viewInAppRelativeUrl }
    : {}),
  ...(rule.alertDelay !== undefined ? { alert_delay: rule.alertDelay } : {}),
});
