/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertExecutionStatus } from '../../../../../alerting/common';
import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';
import { Alert, AlertAction, ResolvedRule } from '../../../types';

const transformAction: RewriteRequestCase<AlertAction> = ({
  group,
  id,
  connector_type_id: actionTypeId,
  params,
}) => ({
  group,
  id,
  params,
  actionTypeId,
});

const transformExecutionStatus: RewriteRequestCase<AlertExecutionStatus> = ({
  last_execution_date: lastExecutionDate,
  ...rest
}) => ({
  lastExecutionDate,
  ...rest,
});

export const transformAlert: RewriteRequestCase<Alert> = ({
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
  execution_status: executionStatus,
  actions: actions,
  ...rest
}: any) => ({
  alertTypeId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  executionStatus: executionStatus ? transformExecutionStatus(executionStatus) : undefined,
  actions: actions
    ? actions.map((action: AsApiContract<AlertAction>) => transformAction(action))
    : [],
  scheduledTaskId,
  ...rest,
});

export const transformResolvedRule: RewriteRequestCase<ResolvedRule> = ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  alias_target_id,
  outcome,
  ...rest
}: any) => {
  return {
    ...transformAlert(rest),
    alias_target_id,
    outcome,
  };
};
