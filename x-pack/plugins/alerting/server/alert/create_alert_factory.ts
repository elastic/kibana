/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState } from '../types';
import { Alert } from './alert';

export interface CreateAlertFactoryOpts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  alerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>;
  shouldProvideRecoveryUtils: boolean;
  originalAlertIds: Set<string>;
  getRecoveredAlertIds: (
    alerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>,
    originalAlertIds: Set<string>
  ) => string[];
  recoveryContext: Record<string, InstanceContext>;
}

export function createAlertFactory<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
>({
  alerts,
  shouldProvideRecoveryUtils,
  originalAlertIds,
  getRecoveredAlertIds,
  recoveryContext,
}: CreateAlertFactoryOpts<InstanceState, InstanceContext, ActionGroupIds>) {
  return {
    create: (id: string): Alert<InstanceState, InstanceContext, ActionGroupIds> => {
      if (!alerts[id]) {
        alerts[id] = new Alert<InstanceState, InstanceContext, ActionGroupIds>();
      }

      return alerts[id];
    },
    done: () => {
      return shouldProvideRecoveryUtils
        ? {
            recoveryUtils: {
              getRecoveredAlertIds: (): string[] => getRecoveredAlertIds(alerts, originalAlertIds),
              setRecoveryContext: (id: string, context: InstanceContext) => {
                recoveryContext[id] = context;
              },
            },
          }
        : {};
    },
  };
}
