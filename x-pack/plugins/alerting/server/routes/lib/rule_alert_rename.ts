/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-nocheck

export const ruleToAlert = ({
  rule_type_id: alertTypeId,
  muted_alert_ids: mutedInstanceIds,
  actions,
  ...rest
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) => ({
  ...rest,
  ...(alertTypeId ? { alertTypeId } : {}),
  ...(mutedInstanceIds ? { mutedInstanceIds } : {}),
  ...(actions
    ? {
        // @ts-ignore
        actions: actions.map(({ connector_type_id: actionTypeId, ...actionRest }) => ({
          ...actionRest,
          ...(actionTypeId ? { actionTypeId } : {}),
        })),
      }
    : {}),
});

export const ruleToAlertParams = ({ rule_id: alertId, alert_id: alertInstanceId, ...rest }) => ({
  ...rest,
  ...(alertId ? { alertId } : {}),
  ...(alertInstanceId ? { alertInstanceId } : {}),
});

export const alertToRule = ({
  alertTypeId,
  mutedInstanceIds,
  alertId,
  alertInstanceId,
  actions,
  alertExecutionStatus,
  ...rest
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) => ({
  ...rest,
  ...(alertTypeId ? { rule_type_id: alertTypeId } : {}),
  ...(alertId ? { rule_id: alertId } : {}),
  ...(alertInstanceId ? { alert_id: alertInstanceId } : {}),
  ...(mutedInstanceIds ? { muted_alert_ids: mutedInstanceIds } : {}),
  ...(alertExecutionStatus ? { rule_execution_status: alertExecutionStatus } : {}),
  ...(actions
    ? {
        actions: actions.map(({ actionTypeId, ...actionRest }) => ({
          ...actionRest,
          ...(actionTypeId ? { connector_type_id: actionTypeId } : {}),
        })),
      }
    : {}),
});
