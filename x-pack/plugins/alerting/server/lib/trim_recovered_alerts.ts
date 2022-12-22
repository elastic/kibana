/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { map } from 'lodash';
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

export interface TrimRecoveredOpts {
  index: number | string;
  flappingHistory: boolean[];
  trackedEvents?: boolean;
}

export function trimRecoveredAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  RecoveryActionGroupIds extends string,
  ActionGroupIds extends string
>(
  logger: Logger,
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  currentRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  maxAlerts: number
): TrimmedRecoveredAlertsResult<State, Context, RecoveryActionGroupIds> {
  const alerts = map(recoveredAlerts, (value, key) => {
    return {
      index: key,
      flappingHistory: value.getFlappingHistory() || [],
    };
  });
  const earlyRecoveredAlerts = getEarlyRecoveredAlerts(logger, alerts, maxAlerts);
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

export function getEarlyRecoveredAlerts(
  logger: Logger,
  recoveredAlerts: TrimRecoveredOpts[],
  maxAlerts: number
) {
  let earlyRecoveredAlerts: TrimRecoveredOpts[] = [];
  if (recoveredAlerts.length > maxAlerts) {
    recoveredAlerts.sort((a, b) => {
      return a.flappingHistory.length - b.flappingHistory.length;
    });

    earlyRecoveredAlerts = recoveredAlerts.splice(maxAlerts);
    logger.warn(
      `Recovered alerts have exceeded the max alert limit: dropping ${
        earlyRecoveredAlerts.length
      } ${earlyRecoveredAlerts.length > 1 ? 'alerts' : 'alert'}.`
    );
  }
  return earlyRecoveredAlerts;
}
