/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext, RawAlertInstance } from '../types';

const MAX_CAPACITY = 20;
const MAX_FLAP_COUNT = 4;

export function determineFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupIds extends string
>(
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {}
) {
  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    const flapping = isFlapping(alert);
    alert.setFlapping(flapping);
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    const flapping = isFlapping(alert);
    alert.setFlapping(flapping);
  }
}

// determines which alerts to return in the state
export function determineAlertsToReturn<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {}
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
    // this is a space saving effort that will stop tracking a recovered alert if it wasn't flapping in the last max capcity number of executions,
    // which will mean once the alert is reported as active again it will be treated as a "new" alert
    if (isFlapping(alert)) {
      recoveredAlertsToReturn[id] = alert.toRaw(true);
    } else if (!atCapacity(alert.getFlappingHistory())) {
      recoveredAlertsToReturn[id] = alert.toRaw(true);
    }
  }
  return { alertsToReturn, recoveredAlertsToReturn };
}

export function isFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>): boolean {
  const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
  const isCurrentlyFlapping = alert.getFlapping();
  const numStateChanges = flappingHistory.filter((f) => f).length;
  if (isCurrentlyFlapping) {
    // if an alert is currently flapping,
    // it will return false if the flappingHistory array is at capacity and there are 0 state changes
    // else it will return true
    return !(atCapacity(flappingHistory) && numStateChanges === 0);
  } else {
    // if an alert is not currently flapping,
    // it will return true if the number of state changes in flappingHistory array >= the max flapping count
    return numStateChanges >= MAX_FLAP_COUNT;
  }
}

export function atCapacity(flappingHistory: boolean[] = []): boolean {
  return flappingHistory.length >= MAX_CAPACITY;
}
