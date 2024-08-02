/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { Logger } from '@kbn/core/server';
import { Alert } from '../alert';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { AlertInstanceContext, AlertInstanceState } from '../types';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';

export interface LogAlertsParams<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  alertingEventLogger: AlertingEventLogger;
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  ruleLogPrefix: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
  canSetRecoveryContext: boolean;
  shouldPersistAlerts: boolean;
}

export function logAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  logger,
  alertingEventLogger,
  newAlerts,
  activeAlerts,
  recoveredAlerts,
  ruleLogPrefix,
  ruleRunMetricsStore,
  canSetRecoveryContext,
  shouldPersistAlerts,
}: LogAlertsParams<State, Context, ActionGroupIds, RecoveryActionGroupId>) {
  const newAlertIds = Object.keys(newAlerts);
  const activeAlertIds = Object.keys(activeAlerts);
  const recoveredAlertIds = Object.keys(recoveredAlerts);

  if (apm.currentTransaction) {
    apm.currentTransaction.addLabels({
      alerting_new_alerts: newAlertIds.length,
      alerting_active_alerts: activeAlertIds.length,
      alerting_recovered_alerts: recoveredAlertIds.length,
    });
  }

  if (activeAlertIds.length > 0 && logger.isLevelEnabled('debug')) {
    logger.debug(
      `rule ${ruleLogPrefix} has ${activeAlertIds.length} active alerts: ${JSON.stringify(
        activeAlertIds.map((alertId) => ({
          instanceId: alertId,
          actionGroup: activeAlerts[alertId].getScheduledActionOptions()?.actionGroup,
        }))
      )}`
    );
  }
  if (recoveredAlertIds.length > 0 && logger.isLevelEnabled('debug')) {
    logger.debug(
      `rule ${ruleLogPrefix} has ${recoveredAlertIds.length} recovered alerts: ${JSON.stringify(
        recoveredAlertIds
      )}`
    );

    if (canSetRecoveryContext) {
      for (const id of recoveredAlertIds) {
        if (!recoveredAlerts[id].hasContext()) {
          logger.debug(
            `rule ${ruleLogPrefix} has no recovery context specified for recovered alert ${id}`
          );
        }
      }
    }
  }

  if (shouldPersistAlerts) {
    ruleRunMetricsStore.setNumberOfNewAlerts(newAlertIds.length);
    ruleRunMetricsStore.setNumberOfActiveAlerts(activeAlertIds.length);
    ruleRunMetricsStore.setNumberOfRecoveredAlerts(recoveredAlertIds.length);
    for (const id of recoveredAlertIds) {
      const alert = recoveredAlerts[id];
      const { group: actionGroup } = alert.getLastScheduledActions() ?? {};
      const uuid = alert.getUuid();
      const state = recoveredAlerts[id].getState();
      const maintenanceWindowIds = alert.getMaintenanceWindowIds();
      const message = `${ruleLogPrefix} alert '${id}' has recovered`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        id,
        uuid,
        group: actionGroup,
        message,
        state,
        flapping: recoveredAlerts[id].getFlapping(),
        ...(maintenanceWindowIds.length ? { maintenanceWindowIds } : {}),
      });
    }

    for (const id of newAlertIds) {
      const alert = activeAlerts[id];
      const { actionGroup } = alert.getScheduledActionOptions() ?? {};
      const state = alert.getState();
      const uuid = alert.getUuid();
      const maintenanceWindowIds = alert.getMaintenanceWindowIds();
      const message = `${ruleLogPrefix} created new alert: '${id}'`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.newInstance,
        id,
        uuid,
        group: actionGroup,
        message,
        state,
        flapping: activeAlerts[id].getFlapping(),
        ...(maintenanceWindowIds.length ? { maintenanceWindowIds } : {}),
      });
    }

    for (const id of activeAlertIds) {
      const alert = activeAlerts[id];
      const { actionGroup } = alert.getScheduledActionOptions() ?? {};
      const state = alert.getState();
      const uuid = alert.getUuid();
      const maintenanceWindowIds = alert.getMaintenanceWindowIds();
      const message = `${ruleLogPrefix} active alert: '${id}' in actionGroup: '${actionGroup}'`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.activeInstance,
        id,
        uuid,
        group: actionGroup,
        message,
        state,
        flapping: activeAlerts[id].getFlapping(),
        ...(maintenanceWindowIds.length ? { maintenanceWindowIds } : {}),
      });
    }
  }
}
