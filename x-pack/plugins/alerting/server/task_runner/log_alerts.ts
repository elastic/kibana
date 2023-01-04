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

  if (activeAlertIds.length > 0) {
    logger.debug(
      `rule ${ruleLogPrefix} has ${activeAlertIds.length} active alerts: ${JSON.stringify(
        activeAlertIds.map((alertId) => ({
          instanceId: alertId,
          actionGroup: activeAlerts[alertId].getScheduledActionOptions()?.actionGroup,
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
      const { group: actionGroup } = recoveredAlerts[id].getLastScheduledActions() ?? {};
      const meta = recoveredAlerts[id].getMeta();
      const message = `${ruleLogPrefix} alert '${id}' has recovered`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        id,
        group: actionGroup,
        message,
        meta,
        flapping: recoveredAlerts[id].getFlapping(),
      });
    }

    for (const id of newAlertIds) {
      const { actionGroup } = activeAlerts[id].getScheduledActionOptions() ?? {};
      const meta = activeAlerts[id].getMeta();
      const message = `${ruleLogPrefix} created new alert: '${id}'`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.newInstance,
        id,
        group: actionGroup,
        message,
        meta,
        flapping: activeAlerts[id].getFlapping(),
      });
    }

    for (const id of activeAlertIds) {
      const { actionGroup } = activeAlerts[id].getScheduledActionOptions() ?? {};
      const meta = activeAlerts[id].getMeta();
      const message = `${ruleLogPrefix} active alert: '${id}' in actionGroup: '${actionGroup}'`;
      alertingEventLogger.logAlert({
        action: EVENT_LOG_ACTIONS.activeInstance,
        id,
        group: actionGroup,
        message,
        meta,
        flapping: activeAlerts[id].getFlapping(),
      });
    }
  }
}
