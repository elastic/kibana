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
  const ra = map(recoveredAlerts, (value, key) => {
    return {
      index: key,
      flappingHistory: value.getFlappingHistory() || [],
    };
  });
  const earlyRecoveredAlerts = alertFactory.alertLimit.trimRecovered(ra);
  // Dropping the "early recovered" alerts for now.
  // In #143445 we will want to recover these alerts and set flapping to false
  earlyRecoveredAlerts.forEach((alert) => {
    delete recoveredAlerts[alert.index];
    delete currentRecoveredAlerts[alert.index];
  });
  return {
    trimmedAlertsRecovered: recoveredAlerts,
    trimmedAlertsRecoveredCurrent: currentRecoveredAlerts,
  };
}
