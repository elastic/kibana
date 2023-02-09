/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AsApiContract } from '@kbn/actions-plugin/common';
import {
  RuleExecutionStatus,
  RuleMonitoring,
  Rule,
  RuleLastRun,
  RuleAction,
  RuleType,
} from '../../common';

function transformAction(input: AsApiContract<RuleAction>): RuleAction {
  const { connector_type_id: actionTypeId, frequency, ...rest } = input;
  return {
    actionTypeId,
    ...(frequency
      ? {
          frequency: {
            summary: frequency.summary,
            throttle: frequency.throttle,
            notifyWhen: frequency.notify_when,
          },
        }
      : {}),
    ...rest,
  };
}

// AsApiContract does not deal with object properties that are dates - the
// API version needs to be a string, and the non-API version needs to be a Date
type ApiRuleExecutionStatus = Omit<AsApiContract<RuleExecutionStatus>, 'last_execution_date'> & {
  last_execution_date: string;
};

function transformExecutionStatus(input: ApiRuleExecutionStatus): RuleExecutionStatus {
  const { last_execution_date: lastExecutionDate, last_duration: lastDuration, ...rest } = input;
  return {
    lastExecutionDate: new Date(lastExecutionDate),
    lastDuration,
    ...rest,
  };
}

function transformMonitoring(input: RuleMonitoring): RuleMonitoring {
  const { run } = input;
  const { last_run: lastRun, ...rest } = run;
  const { timestamp, ...restLastRun } = lastRun;

  return {
    run: {
      last_run: {
        timestamp: input.run.last_run.timestamp,
        ...restLastRun,
      },
      ...rest,
    },
  };
}

function transformLastRun(input: AsApiContract<RuleLastRun>): RuleLastRun {
  const {
    outcome_msg: outcomeMsg,
    alerts_count: alertsCount,
    outcome_order: outcomeOrder,
    ...rest
  } = input;
  return {
    outcomeMsg,
    alertsCount,
    outcomeOrder,
    ...rest,
  };
}

// AsApiContract does not deal with object properties that also
// need snake -> camel conversion, Dates, are renamed, etc, so we do by hand
export type ApiRule = Omit<
  AsApiContract<Rule>,
  | 'execution_status'
  | 'actions'
  | 'created_at'
  | 'updated_at'
  | 'alert_type_id'
  | 'muted_instance_ids'
  | 'last_run'
  | 'next_run'
> & {
  execution_status: ApiRuleExecutionStatus;
  actions: Array<AsApiContract<RuleAction>>;
  created_at: string;
  updated_at: string;
  rule_type_id: string;
  muted_alert_ids: string[];
  last_run?: AsApiContract<RuleLastRun>;
  next_run?: string;
};

export function transformRule(input: ApiRule): Rule {
  const {
    rule_type_id: alertTypeId,
    created_by: createdBy,
    updated_by: updatedBy,
    created_at: createdAt,
    updated_at: updatedAt,
    api_key: apiKey,
    api_key_owner: apiKeyOwner,
    notify_when: notifyWhen,
    mute_all: muteAll,
    muted_alert_ids: mutedInstanceIds,
    scheduled_task_id: scheduledTaskId,
    execution_status: executionStatusAPI,
    actions: actionsAPI,
    next_run: nextRun,
    last_run: lastRun,
    monitoring: monitoring,
    ...rest
  } = input;

  return {
    alertTypeId,
    createdBy,
    updatedBy,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
    apiKey,
    apiKeyOwner,
    notifyWhen,
    muteAll,
    mutedInstanceIds,
    executionStatus: transformExecutionStatus(executionStatusAPI),
    actions: actionsAPI ? actionsAPI.map((action) => transformAction(action)) : [],
    scheduledTaskId,
    ...(nextRun ? { nextRun: new Date(nextRun) } : {}),
    ...(monitoring ? { monitoring: transformMonitoring(monitoring) } : {}),
    ...(lastRun ? { lastRun: transformLastRun(lastRun) } : {}),
    ...rest,
  };
}

export function transformRuleType(input: AsApiContract<RuleType>): RuleType {
  const {
    recovery_action_group: recoveryActionGroup,
    action_groups: actionGroups,
    default_action_group_id: defaultActionGroupId,
    minimum_license_required: minimumLicenseRequired,
    action_variables: actionVariables,
    rule_task_timeout: ruleTaskTimeout,
    is_exportable: isExportable,
    authorized_consumers: authorizedConsumers,
    enabled_in_license: enabledInLicense,
    ...rest
  } = input;

  return {
    recoveryActionGroup,
    actionGroups,
    defaultActionGroupId,
    minimumLicenseRequired,
    actionVariables,
    ruleTaskTimeout,
    isExportable,
    authorizedConsumers,
    enabledInLicense,
    ...rest,
  };
}
