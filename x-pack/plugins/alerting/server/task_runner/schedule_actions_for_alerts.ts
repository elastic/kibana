/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
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
    activeAlerts,
    recoveryActionGroup,
    recoveredAlerts,
    executionHandler,
    mutedAlertIdsSet,
    ruleLabel,
    ruleRunMetricsStore,
    throttle,
    notifyWhen,
  } = params;
  // execute alerts with executable actions
  for (const [alertId, alert] of Object.entries(activeAlerts)) {
    const executeAction: boolean = shouldExecuteAction(
      alertId,
      alert,
      mutedAlertIdsSet,
      ruleLabel,
      logger,
      throttle,
      notifyWhen
    );
    if (executeAction && alert.hasScheduledActions()) {
      const { actionGroup, state } = alert.getScheduledActionOptions()!;
      await executeAlert(alertId, alert, executionHandler, ruleRunMetricsStore, actionGroup, state);
    }
  }

  // execute recovered alerts
  for (const alertId of Object.keys(recoveredAlerts)) {
    if (mutedAlertIdsSet.has(alertId)) {
      logger.debug(
        `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: instance is muted`
      );
    } else {
      const alert = recoveredAlerts[alertId];
      await executeAlert(
        alertId,
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
  state: InstanceState
) {
  alert.updateLastScheduledActions(actionGroup);
  alert.unscheduleActions();
  return executionHandler({
    actionGroup,
    context: alert.getContext(),
    state,
    alertId,
    ruleRunMetricsStore,
  });
}

function shouldExecuteAction<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
>(
  alertId: string,
  alert: Alert<InstanceState, InstanceContext, ActionGroupIds>,
  mutedAlertIdsSet: Set<string>,
  ruleLabel: string,
  logger: Logger,
  throttle: string | null,
  notifyWhen: string | null
) {
  const throttled = alert.isThrottled(throttle);
  const muted = mutedAlertIdsSet.has(alertId);
  let executeAction = true;

  if (throttled || muted) {
    executeAction = false;
    logger.debug(
      `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: rule is ${
        muted ? 'muted' : 'throttled'
      }`
    );
  } else if (notifyWhen === 'onActionGroupChange' && !alert.scheduledActionGroupHasChanged()) {
    executeAction = false;
    logger.debug(
      `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: alert is active but action group has not changed`
    );
  }

  return executeAction;
}
