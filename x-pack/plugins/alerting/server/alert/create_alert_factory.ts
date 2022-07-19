/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { cloneDeep } from 'lodash';
import { AlertInstanceContext, AlertInstanceState } from '../types';
import { Alert, PublicAlert } from './alert';
import { processAlerts } from '../lib';

export interface AlertFactoryDoneUtils<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  getRecoveredAlerts: () => Array<Alert<State, Context, ActionGroupIds>>;
}

export interface CreateAlertFactoryOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
> {
  alerts: Record<string, Alert<State, Context>>;
  logger: Logger;
  canSetRecoveryContext?: boolean;
}

export function createAlertFactory<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
>({ alerts, logger, canSetRecoveryContext = false }: CreateAlertFactoryOpts<State, Context>) {
  // Keep track of which alerts we started with so we can determine which have recovered
  const originalAlerts = cloneDeep(alerts);
  let isDone = false;
  return {
    create: (id: string): PublicAlert<State, Context, ActionGroupIds> => {
      if (isDone) {
        throw new Error(`Can't create new alerts after calling done() in AlertsFactory.`);
      }
      if (!alerts[id]) {
        alerts[id] = new Alert<State, Context>(id);
      }

      return alerts[id];
    },
    done: (): AlertFactoryDoneUtils<State, Context, ActionGroupIds> => {
      isDone = true;
      return {
        getRecoveredAlerts: () => {
          if (!canSetRecoveryContext) {
            logger.debug(
              `Set doesSetRecoveryContext to true on rule type to get access to recovered alerts.`
            );
            return [];
          }

          const { recoveredAlerts } = processAlerts<State, Context, ActionGroupIds, ActionGroupIds>(
            alerts,
            originalAlerts
          );
          return Object.keys(recoveredAlerts ?? {}).map(
            (alertId: string) => recoveredAlerts[alertId]
          );
        },
      };
    },
  };
}
