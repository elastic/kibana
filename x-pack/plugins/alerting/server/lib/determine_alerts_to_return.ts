/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext, RawAlertInstance } from '../types';

// determines which alerts to return in the state
export function determineAlertsToReturn<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
>(
  activeAlerts: Record<string, Alert<State, Context>> = {},
  recoveredAlerts: Record<string, Alert<State, Context>> = {}
): {
  alertsToReturn: Record<string, RawAlertInstance>;
  recoveredAlertsToReturn: Record<string, RawAlertInstance>;
} {
  const alertsToReturn: Record<string, RawAlertInstance> = {};
  const recoveredAlertsToReturn: Record<string, RawAlertInstance> = {};

  // return all active alerts regardless of whether or not the alert is flapping
  for (const id of keys(activeAlerts)) {
    alertsToReturn[id] = activeAlerts[id].toRaw();
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    // return recovered alerts if they are flapping or if the flapping array is not at capacity
    // this is a space saving effort that will stop tracking a recovered alert if it wasn't flapping and doesn't have state changes
    // in the last max capcity number of executions
    const flapping = alert.getFlapping();
    const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
    const numStateChanges = flappingHistory.filter((f) => f).length;
    if (flapping) {
      recoveredAlertsToReturn[id] = alert.toRaw(true);
    } else if (numStateChanges > 0) {
      recoveredAlertsToReturn[id] = alert.toRaw(true);
    }
  }
  return { alertsToReturn, recoveredAlertsToReturn };
}
