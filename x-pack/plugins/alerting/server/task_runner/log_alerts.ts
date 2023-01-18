/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { Logger } from '@kbn/core/server';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { LastScheduledActions } from '../types';

export interface LogAlertsParams<Alert> {
  logger: Logger;
  alertingEventLogger: AlertingEventLogger;
  newAlerts: Record<string, Alert>;
  activeAlerts: Record<string, Alert>;
  recoveredAlerts: Record<string, Alert>;
  ruleLogPrefix: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
  canSetRecoveryContext: boolean;
  shouldPersistAlerts: boolean;
  getAlertData: (alert: Alert) => {
    actionGroup: string | undefined;
    hasContext: boolean;
    lastScheduledActions: LastScheduledActions;
    state: Record<string, unknown>;
    flapping: boolean;
  };
}

export function logAlerts<Alert>({
  logger,
  alertingEventLogger,
  newAlerts,
  activeAlerts,
  recoveredAlerts,
  ruleLogPrefix,
  ruleRunMetricsStore,
  canSetRecoveryContext,
  shouldPersistAlerts,
  getAlertData,
}: LogAlertsParams<Alert>) {
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

  if (activeAlertIds.length > 0) {
    logger.debug(
      `rule ${ruleLogPrefix} has ${activeAlertIds.length} active alerts: ${JSON.stringify(
        activeAlertIds.map((alertId) => ({
          instanceId: alertId,
          actionGroup: getAlertData(activeAlerts[alertId]).actionGroup,
        }))
      )}`
    );
  }
  if (recoveredAlertIds.length > 0) {
    logger.debug(
      `rule ${ruleLogPrefix} has ${recoveredAlertIds.length} recovered alerts: ${JSON.stringify(
        recoveredAlertIds
      )}`
    );

    if (canSetRecoveryContext) {
      for (const id of recoveredAlertIds) {
        if (!getAlertData(recoveredAlerts[id]).hasContext) {
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
      const recoveredAlertData = getAlertData(recoveredAlerts[id]);
      const { group: actionGroup } = recoveredAlertData.lastScheduledActions ?? {};
      const state = recoveredAlertData.state;
      const message = `${ruleLogPrefix} alert '${id}' has recovered`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        id,
        group: actionGroup,
        message,
        state,
        flapping: recoveredAlertData.flapping,
      });
    }

    for (const id of newAlertIds) {
      const newAlertData = getAlertData(activeAlerts[id]);
      const actionGroup = newAlertData.actionGroup;
      const state = newAlertData.state;
      const message = `${ruleLogPrefix} created new alert: '${id}'`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.newInstance,
        id,
        group: actionGroup,
        message,
        state,
        flapping: newAlertData.flapping,
      });
    }

    for (const id of activeAlertIds) {
      const activeAlertData = getAlertData(activeAlerts[id]);
      const actionGroup = activeAlertData.actionGroup;
      const state = activeAlertData.state;
      const message = `${ruleLogPrefix} active alert: '${id}' in actionGroup: '${actionGroup}'`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.activeInstance,
        id,
        group: actionGroup,
        message,
        state,
        flapping: activeAlertData.flapping,
      });
    }
  }
}
