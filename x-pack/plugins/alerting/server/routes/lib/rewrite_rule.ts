/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';

import { RuleTypeParams, SanitizedRule } from '../../types';

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
  snoozeEndTime,
  ...rest
}: SanitizedRule<RuleTypeParams>) => ({
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
  // Remove this object spread boolean check after snoozeEndTime is added to the public API
  ...(snoozeEndTime !== undefined ? { snooze_end_time: snoozeEndTime } : {}),
  execution_status: executionStatus && {
    ...omit(executionStatus, 'lastExecutionDate', 'lastDuration'),
    last_execution_date: executionStatus.lastExecutionDate,
    last_duration: executionStatus.lastDuration,
  },
  actions: actions.map(({ group, id, actionTypeId, params }) => ({
    group,
    id,
    params,
    connector_type_id: actionTypeId,
  })),
});
