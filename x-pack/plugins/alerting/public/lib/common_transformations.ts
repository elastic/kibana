/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertExecutionStatus, Alert, AlertAction, RuleType } from '../../common';
import { AsApiContract } from '../../../actions/common';

function transformAction(input: AsApiContract<AlertAction>): AlertAction {
  const { connector_type_id: actionTypeId, ...rest } = input;
  return { actionTypeId, ...rest };
}

// AsApiContract does not deal with object properties that are dates - the
// API version needs to be a string, and the non-API version needs to be a Date
type ApiAlertExecutionStatus = Omit<AsApiContract<AlertExecutionStatus>, 'last_execution_date'> & {
  last_execution_date: string;
};

function transformExecutionStatus(input: ApiAlertExecutionStatus): AlertExecutionStatus {
  const { last_execution_date: lastExecutionDate, last_duration: lastDuration, ...rest } = input;
  return {
    lastExecutionDate: new Date(lastExecutionDate),
    lastDuration,
    ...rest,
  };
}

// AsApiContract does not deal with object properties that also
// need snake -> camel conversion, Dates, are renamed, etc, so we do by hand
export type ApiAlert = Omit<
  AsApiContract<Alert>,
  | 'execution_status'
  | 'actions'
  | 'created_at'
  | 'updated_at'
  | 'alert_type_id'
  | 'muted_instance_ids'
> & {
  execution_status: ApiAlertExecutionStatus;
  actions: Array<AsApiContract<AlertAction>>;
  created_at: string;
  updated_at: string;
  rule_type_id: string;
  muted_alert_ids: string[];
};

export function transformAlert(input: ApiAlert): Alert {
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
