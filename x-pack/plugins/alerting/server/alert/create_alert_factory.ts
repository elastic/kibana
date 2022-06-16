/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { AlertInstanceContext, AlertInstanceState } from '../types';
import { Alert } from './alert';
import { getCategorizedAlerts } from '../lib';

export interface AlertFactoryDoneUtils<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  getRecoveredAlerts: () => Array<Alert<InstanceState, InstanceContext>>;
}

export interface CreateAlertFactoryOpts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  alerts: Record<string, Alert<InstanceState, InstanceContext>>;
  logger: Logger;
  canSetRecoveryContext?: boolean;
}

export function createAlertFactory<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
>({
  alerts,
  logger,
  canSetRecoveryContext = false,
}: CreateAlertFactoryOpts<InstanceState, InstanceContext>) {
  // Keep track of which alerts we started with so we can determine which have recovered
  const initialAlertIds = new Set(Object.keys(alerts));

  let newAlerts: Record<string, Alert<InstanceState, InstanceContext>> | null = null;
  let activeAlerts: Record<string, Alert<InstanceState, InstanceContext>> | null = null;
  let recoveredAlerts: Record<string, Alert<InstanceState, InstanceContext>> | null = null;

  function populateAlerts() {
    const categorizedAlerts = getCategorizedAlerts(alerts, initialAlertIds);
    newAlerts = categorizedAlerts.newAlerts;
    activeAlerts = categorizedAlerts.activeAlerts;
    recoveredAlerts = categorizedAlerts.recoveredAlerts;
  }
  let isDone = false;
  return {
    create: (id: string): Alert<InstanceState, InstanceContext> => {
      if (isDone) {
        throw new Error(`Can't create new alerts after calling done() in AlertsFactory.`);
      }
      if (!alerts[id]) {
        alerts[id] = new Alert<InstanceState, InstanceContext>(id);
      }

      return alerts[id];
    },
    getAlerts: () => {
      if (!newAlerts || !activeAlerts || !recoveredAlerts) {
        populateAlerts();
      }
      return {
        newAlerts: newAlerts!,
        activeAlerts: activeAlerts!,
        recoveredAlerts: recoveredAlerts!,
      };
    },
    done: (): AlertFactoryDoneUtils<InstanceState, InstanceContext> => {
      isDone = true;
      return {
        getRecoveredAlerts: () => {
          if (!canSetRecoveryContext) {
            logger.debug(
              `Set doesSetRecoveryContext to true on rule type to get access to recovered alerts.`
            );
            return [];
          }

          if (!recoveredAlerts) {
            populateAlerts();
          }

          return Object.keys(recoveredAlerts ?? {}).map(
            (alertId: string) => recoveredAlerts![alertId]
          );
        },
      };
    },
  };
}
