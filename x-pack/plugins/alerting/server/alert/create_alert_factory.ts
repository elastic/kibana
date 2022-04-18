/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { AlertInstanceContext, AlertInstanceState } from '../types';
import { Alert } from './alert';
import { getRecoveredAlerts } from '../lib';

export interface AlertFactoryDoneUtils<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  getRecoveredAlerts: () => Array<Alert<InstanceState, InstanceContext, ActionGroupIds>>;
}

export interface CreateAlertFactoryOpts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  alerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>;
  logger: Logger;
  canSetRecoveryContext?: boolean;
}

export function createAlertFactory<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
>({
  alerts,
  logger,
  canSetRecoveryContext = false,
}: CreateAlertFactoryOpts<InstanceState, InstanceContext, ActionGroupIds>) {
  // Keep track of which alerts we started with so we can determine which have recovered
  const initialAlertIds = new Set(Object.keys(alerts));
  let isDone = false;
  return {
    create: (id: string): Alert<InstanceState, InstanceContext, ActionGroupIds> => {
      if (isDone) {
        throw new Error(`Can't create new alerts after calling done() in AlertsFactory.`);
      }
      if (!alerts[id]) {
        alerts[id] = new Alert<InstanceState, InstanceContext, ActionGroupIds>(id);
      }

      return alerts[id];
    },
    done: (): AlertFactoryDoneUtils<InstanceState, InstanceContext, ActionGroupIds> => {
      isDone = true;
      return {
        getRecoveredAlerts: () => {
          if (!canSetRecoveryContext) {
            logger.debug(
              `Set doesSetRecoveryContext to true on rule type to get access to recovered alerts.`
            );
            return [];
          }

          const recoveredAlerts = getRecoveredAlerts(alerts, initialAlertIds);
          return Object.keys(recoveredAlerts ?? []).map(
            (alertId: string) => recoveredAlerts[alertId]
          );
        },
      };
    },
  };
}
