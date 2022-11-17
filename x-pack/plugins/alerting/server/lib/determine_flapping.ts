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
  ActionGroupIds extends string
>(activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {}): Set<string> {
  const flappingAlertIds = new Set<string>();

  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    if (isFlapping(alert)) {
      flappingAlertIds.add(id);
    }
  }

  return flappingAlertIds;
}

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

  for (const id of keys(activeAlerts)) {
    alertsToReturn[id] = activeAlerts[id].toRaw();
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    // return recovered alerts if they are flapping or if the flapping array is not at capacity
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
  // an alert is determined flapping if the number of state changes in flappingHistory array >= the max flapping count
  const numStateChanges = flappingHistory.filter((f) => f).length;
  return numStateChanges >= MAX_FLAP_COUNT;
}

export function atCapacity(flappingHistory: boolean[] = []): boolean {
  return flappingHistory.length >= MAX_CAPACITY;
}
