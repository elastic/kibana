/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionHandler } from './create_execution_handler';
import { ScheduleActionsForAlertsParams } from './types';
import { AlertInstanceState, AlertInstanceContext } from '../types';
import { Alert } from '../alert';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';

export async function scheduleActionsForAlerts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  params: ScheduleActionsForAlertsParams<
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >
): Promise<void> {
  const {
    logger,
    alertsWithExecutableActions,
    recoveryActionGroup,
    recoveredAlerts,
    executionHandler,
    mutedAlertIdsSet,
    ruleLabel,
    ruleRunMetricsStore,
  } = params;
  // execute alerts with executable actions
  for (const [alertId, alert] of alertsWithExecutableActions) {
    const { actionGroup, subgroup: actionSubgroup, state } = alert.getScheduledActionOptions()!;
    await executeAlert(
      alertId,
      alert,
      executionHandler,
      ruleRunMetricsStore,
      actionGroup,
      state,
      actionSubgroup
    );
  }

  // execute recovered alerts
  const recoveredIds = Object.keys(recoveredAlerts);
  for (const id of recoveredIds) {
    if (mutedAlertIdsSet.has(id)) {
      logger.debug(
        `skipping scheduling of actions for '${id}' in rule ${ruleLabel}: instance is muted`
      );
    } else {
      const alert = recoveredAlerts[id];
      await executeAlert(
        id,
        alert,
        executionHandler,
        ruleRunMetricsStore,
        recoveryActionGroup.id,
        {} as InstanceState
      );
      alert.scheduleActions(recoveryActionGroup.id);
    }
  }
}

async function executeAlert<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  alertId: string,
  alert: Alert<InstanceState, InstanceContext, ActionGroupIds | RecoveryActionGroupId>,
  executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>,
  ruleRunMetricsStore: RuleRunMetricsStore,
  actionGroup: ActionGroupIds | RecoveryActionGroupId,
  state: InstanceState,
  actionSubgroup?: string
) {
  alert.updateLastScheduledActions(actionGroup, actionSubgroup);
  alert.unscheduleActions();
  return executionHandler({
    actionGroup,
    actionSubgroup,
    context: alert.getContext(),
    state,
    alertId,
    ruleRunMetricsStore,
  });
}
