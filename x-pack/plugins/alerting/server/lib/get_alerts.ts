/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { millisToNanos } from '@kbn/event-log-plugin/server';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

interface GetAlertsResult<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
}

export function getAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  alerts: Record<string, Alert<State, Context>>,
  originalAlertIds: Set<string>
): GetAlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId> {
  const currentTime = new Date().toISOString();
  const newAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {};
  const activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {};
  const recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {};

  for (const id in alerts) {
    if (alerts.hasOwnProperty(id)) {
      // alerts with scheduled actions are considered "active"
      if (alerts[id].hasScheduledActions()) {
        activeAlerts[id] = alerts[id];

        // if this alert did not exist in previous run, it is considered "new"
        if (!originalAlertIds.has(id)) {
          newAlerts[id] = alerts[id];

          // Inject start time into alert state for new alerts
          const state = newAlerts[id].getState();
          newAlerts[id].replaceState({ ...state, start: currentTime, duration: '0' });
        } else {
          // this alert did exist in previous run
          // calculate duration to date for active alerts
          const state = originalAlertIds.has(id)
            ? alerts[id].getState()
            : activeAlerts[id].getState();
          const durationInMs =
            new Date(currentTime).valueOf() - new Date(state.start as string).valueOf();
          const duration = state.start ? millisToNanos(durationInMs) : undefined;
          activeAlerts[id].replaceState({
            ...state,
            ...(state.start ? { start: state.start } : {}),
            ...(duration !== undefined ? { duration } : {}),
          });
        }
      } else {
        if (originalAlertIds.has(id)) {
          recoveredAlerts[id] = alerts[id];

          // Inject end time into alert state of recovered alerts
          const state = recoveredAlerts[id].getState();
          const durationInMs =
            new Date(currentTime).valueOf() - new Date(state.start as string).valueOf();
          const duration = state.start ? millisToNanos(durationInMs) : undefined;
          recoveredAlerts[id].replaceState({
            ...state,
            ...(duration ? { duration } : {}),
            ...(state.start ? { end: currentTime } : {}),
          });
        }
      }
    }
  }
  return { recoveredAlerts, newAlerts, activeAlerts };
}
