/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';
import { MAX_FLAP_COUNT } from './flapping_utils';

export function getAlertsForNotification<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupIds extends string
>(
  actionGroupId: ActionGroupIds,
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  currentRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {}
) {
  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    alert.resetPendingRecoveredCount();
  }

  for (const id of keys(currentRecoveredAlerts)) {
    const alert = recoveredAlerts[id];
    const flapping = alert.getFlapping();
    if (flapping) {
      alert.incrementPendingRecoveredCount();

      if (alert.getPendingRecoveredCount() < MAX_FLAP_COUNT) {
        const context = alert.getContext();
        const lastActionGroupId = alert.getLastScheduledActions()?.group;
        const newAlert = new Alert<State, Context, ActionGroupIds>(id, alert.toRaw());
        newAlert.scheduleActions(
          lastActionGroupId ? (lastActionGroupId as ActionGroupIds) : actionGroupId,
          context
        );
        activeAlerts[id] = newAlert;

        delete recoveredAlerts[id];
        delete currentRecoveredAlerts[id];
      } else {
        alert.resetPendingRecoveredCount();
      }
    }
  }

  return {
    newAlerts,
    activeAlerts,
    recoveredAlerts,
    currentRecoveredAlerts,
  };
}
