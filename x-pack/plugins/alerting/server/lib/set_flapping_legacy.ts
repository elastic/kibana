/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';
import { isFlapping } from './flapping_utils';

export function setFlappingLegacy<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
>(
  activeAlerts: Record<string, Alert<State, Context>> = {},
  recoveredAlerts: Record<string, Alert<State, Context>> = {}
) {
  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    const flapping = isAlertFlapping(alert);
    alert.setFlapping(flapping);
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    const flapping = isAlertFlapping(alert);
    alert.setFlapping(flapping);
  }
}

export function isAlertFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
>(alert: Alert<State, Context>): boolean {
  const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
  const isCurrentlyFlapping = alert.getFlapping();
  return isFlapping(flappingHistory, isCurrentlyFlapping);
}
