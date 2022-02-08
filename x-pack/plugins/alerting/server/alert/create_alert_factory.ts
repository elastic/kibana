/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState } from '../types';
import { Alert } from './alert';

export interface AlertFactoryDoneUtils<
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> {
  getRecoveredAlerts?: () => AlertsMap<InstanceState, InstanceContext>;
}

export type AlertsMap<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string = never
> = Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>;

export interface CreateAlertFactoryOpts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  alerts: AlertsMap<InstanceState, InstanceContext, ActionGroupIds>;
  setsRecoveryContext: boolean;
  getRecoveredAlerts: () => AlertsMap<InstanceState, InstanceContext>;
}

export function createAlertFactory<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
>({
  alerts,
  setsRecoveryContext,
  getRecoveredAlerts,
}: CreateAlertFactoryOpts<InstanceState, InstanceContext, ActionGroupIds>) {
  let isDone = false;
  return {
    create: (id: string): Alert<InstanceState, InstanceContext, ActionGroupIds> => {
      if (isDone) {
        throw new Error(`Can't create new alerts after calling done().`);
      }
      if (!alerts[id]) {
        alerts[id] = new Alert<InstanceState, InstanceContext, ActionGroupIds>();
      }

      return alerts[id];
    },
    done: (): AlertFactoryDoneUtils<InstanceState, InstanceContext> => {
      isDone = true;
      return setsRecoveryContext
        ? {
            getRecoveredAlerts: () => getRecoveredAlerts(),
          }
        : {};
    },
  };
}
