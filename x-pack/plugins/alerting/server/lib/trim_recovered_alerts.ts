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
  earlyRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>>;
}

export interface TrimRecoveredOpts {
  key: string;
  flappingHistory: boolean[];
}

export function trimRecoveredAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  RecoveryActionGroupIds extends string
>(
  logger: Logger,
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  maxAlerts: number
): TrimmedRecoveredAlertsResult<State, Context, RecoveryActionGroupIds> {
  const alerts = map(recoveredAlerts, (value, key) => {
    return {
      key,
      flappingHistory: value.getFlappingHistory() || [],
    };
  });
  const earlyRecoveredAlertOpts = getEarlyRecoveredAlerts(logger, alerts, maxAlerts);
  const earlyRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {};
  earlyRecoveredAlertOpts.forEach((opt) => {
    const alert = recoveredAlerts[opt.key];
    alert.setFlapping(false);
    earlyRecoveredAlerts[opt.key] = recoveredAlerts[opt.key];

    delete recoveredAlerts[opt.key];
  });
  return {
    trimmedAlertsRecovered: recoveredAlerts,
    earlyRecoveredAlerts,
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

    earlyRecoveredAlerts = recoveredAlerts.slice(maxAlerts);
    logger.warn(
      `Recovered alerts have exceeded the max alert limit of ${maxAlerts} : dropping ${
        earlyRecoveredAlerts.length
      } ${earlyRecoveredAlerts.length > 1 ? 'alerts' : 'alert'}.`
    );
  }
  return earlyRecoveredAlerts;
}
