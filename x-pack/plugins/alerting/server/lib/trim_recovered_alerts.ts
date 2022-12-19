/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import { Alert } from '../alert';
import { AlertFactory } from '../alert/create_alert_factory';
import { AlertInstanceState, AlertInstanceContext, WithoutReservedActionGroups } from '../types';

interface TrimmedRecoveredAlertsResult<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  RecoveryActionGroupIds extends string
> {
  trimmedAlertsRecovered: Record<string, Alert<State, Context, RecoveryActionGroupIds>>;
  trimmedAlertsRecoveredCurrent: Record<string, Alert<State, Context, RecoveryActionGroupIds>>;
  earlyRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>>;
}

export function trimRecoveredAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  RecoveryActionGroupIds extends string,
  ActionGroupIds extends string
>(
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  currentRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  alertFactory: AlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupIds>
  >
): TrimmedRecoveredAlertsResult<State, Context, RecoveryActionGroupIds> {
  const alerts = map(recoveredAlerts, (value, key) => {
    return {
      index: key,
      flappingHistory: value.getFlappingHistory() || [],
    };
  });
  const earlyRecoveredAlertOpts = alertFactory.alertLimit.trimRecovered(alerts);
  const earlyRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {};
  earlyRecoveredAlertOpts.forEach((opt) => {
    const alert = recoveredAlerts[opt.index];
    alert.setFlapping(false);
    earlyRecoveredAlerts[opt.index] = recoveredAlerts[opt.index];

    delete recoveredAlerts[opt.index];
    delete currentRecoveredAlerts[opt.index];
  });
  return {
    trimmedAlertsRecovered: recoveredAlerts,
    trimmedAlertsRecoveredCurrent: currentRecoveredAlerts,
    earlyRecoveredAlerts,
  };
}
