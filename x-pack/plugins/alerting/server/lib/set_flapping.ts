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
import { RulesSettingsFlappingProperties } from '../../common/rules_settings';

export function setFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupIds extends string
>(
  flappingSettings: RulesSettingsFlappingProperties,
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {}
) {
  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    const flapping = flappingSettings.enabled ? isAlertFlapping(flappingSettings, alert) : false;
    alert.setFlapping(flapping);
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    const flapping = flappingSettings.enabled ? isAlertFlapping(flappingSettings, alert) : false;
    alert.setFlapping(flapping);
  }
}

export function isAlertFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  flappingSettings: RulesSettingsFlappingProperties,
  alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>
): boolean {
  const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
  const isCurrentlyFlapping = alert.getFlapping();
  return isFlapping(flappingSettings, flappingHistory, isCurrentlyFlapping);
}
