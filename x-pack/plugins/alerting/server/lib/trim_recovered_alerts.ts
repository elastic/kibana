/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { pick } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

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
  RecoveryActionGroupIds extends string
>(
  logger: Logger,
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  currentRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  alertLimit: number
): TrimmedRecoveredAlertsResult<State, Context, RecoveryActionGroupIds> {
  if (Object.keys(recoveredAlerts).length >= alertLimit) {
    const entries = Object.entries(recoveredAlerts);
    entries.sort((a, b) => {
      const flappingHistoryA = a[1].getFlappingHistory() || [];
      const flappingHistoryB = b[1].getFlappingHistory() || [];
      return flappingHistoryA.length - flappingHistoryB.length;
    });

    // Dropping the "early recovered" alerts for now.
    // In #143445 we will want to recover these alerts and set flapping to false
    const earlyRecoveredAlerts = entries.splice(alertLimit * 1);
    logger.warn(
      `Recovered alerts have exceeded the max alert limit: dropping ${
        earlyRecoveredAlerts.length
      } ${earlyRecoveredAlerts.length > 1 ? 'alerts' : 'alert'}.`
    );
    const trimmedAlerts = Object.fromEntries(entries);
    return {
      trimmedAlertsRecovered: trimmedAlerts,
      trimmedAlertsRecoveredCurrent: pick(currentRecoveredAlerts, Object.keys(trimmedAlerts)),
    };
  }
  return {
    trimmedAlertsRecovered: recoveredAlerts,
    trimmedAlertsRecoveredCurrent: currentRecoveredAlerts,
  };
}
