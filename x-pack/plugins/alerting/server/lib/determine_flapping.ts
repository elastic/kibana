/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { keys } from 'lodash';
import { Alert } from '../alert';
import {
  AlertInstanceState,
  AlertInstanceContext,
  RawAlertInstance,
  RawAlertRecoveredInstance,
} from '../types';

export function determineFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  logger: Logger,
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {}
): {
  alertsToReturn: Record<string, RawAlertInstance>;
  recoveredAlertsToReturn: Record<string, RawAlertRecoveredInstance>;
} {
  const alertsToReturn: Record<string, RawAlertInstance> = {};
  const recoveredAlertsToReturn: Record<string, RawAlertRecoveredInstance> = {};

  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    if (alert.isFlapping()) {
      logger.info(`Alert:${id} is flapping.`);
    }
    alertsToReturn[id] = alert.toRaw();
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    const { atCapacity } = alert.flappingHistoryAtCapacity();
    if (alert.isFlapping()) {
      logger.info(`Alert:${id} is flapping.`);
      recoveredAlertsToReturn[id] = alert.toRawRecovered();
    } else if (!atCapacity) {
      recoveredAlertsToReturn[id] = alert.toRawRecovered();
    }
  }
  return { alertsToReturn, recoveredAlertsToReturn };
}
