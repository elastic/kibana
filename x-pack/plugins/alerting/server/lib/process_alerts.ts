/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { millisToNanos } from '@kbn/event-log-plugin/server';
import { cloneDeep } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

interface ProcessAlertsOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
> {
  alerts: Record<string, Alert<State, Context>>;
  existingAlerts: Record<string, Alert<State, Context>>;
  hasReachedAlertLimit: boolean;
  alertLimit: number;
}
interface ProcessAlertsResult<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
}

export function processAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  alerts,
  existingAlerts,
  hasReachedAlertLimit,
  alertLimit,
}: ProcessAlertsOpts<State, Context>): ProcessAlertsResult<
  State,
  Context,
  ActionGroupIds,
  RecoveryActionGroupId
> {
  return hasReachedAlertLimit
    ? processAlertsLimitReached(alerts, existingAlerts, alertLimit)
    : processAlertsHelper(alerts, existingAlerts);
}

function processAlertsHelper<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  alerts: Record<string, Alert<State, Context>>,
  existingAlerts: Record<string, Alert<State, Context>>
): ProcessAlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId> {
  const existingAlertIds = new Set(Object.keys(existingAlerts));

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
        if (!existingAlertIds.has(id)) {
          newAlerts[id] = alerts[id];

          // Inject start time into alert state for new alerts
          const state = newAlerts[id].getState();
          newAlerts[id].replaceState({ ...state, start: currentTime, duration: '0' });
        } else {
          // this alert did exist in previous run
          // calculate duration to date for active alerts
          const state = existingAlerts[id].getState();
          const durationInMs =
            new Date(currentTime).valueOf() - new Date(state.start as string).valueOf();
          const duration = state.start ? millisToNanos(durationInMs) : undefined;
          activeAlerts[id].replaceState({
            ...state,
            ...(state.start ? { start: state.start } : {}),
            ...(duration !== undefined ? { duration } : {}),
          });
        }
      } else if (existingAlertIds.has(id)) {
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
  return { recoveredAlerts, newAlerts, activeAlerts };
}

function processAlertsLimitReached<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  alerts: Record<string, Alert<State, Context>>,
  existingAlerts: Record<string, Alert<State, Context>>,
  alertLimit: number
): ProcessAlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId> {
  const existingAlertIds = new Set(Object.keys(existingAlerts));

  // When the alert limit has been reached,
  // - skip determination of recovered alerts
  // - pass through all existing alerts as active
  // - add any new alerts, up to the max allowed

  const currentTime = new Date().toISOString();
  const newAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {};

  // all existing alerts stay active
  const activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = cloneDeep(
    existingAlerts
  );

  // update duration for existing alerts
  for (const id in activeAlerts) {
    if (activeAlerts.hasOwnProperty(id)) {
      if (alerts.hasOwnProperty(id)) {
        activeAlerts[id] = alerts[id];
      }
      const state = existingAlerts[id].getState();
      const durationInMs =
        new Date(currentTime).valueOf() - new Date(state.start as string).valueOf();
      const duration = state.start ? millisToNanos(durationInMs) : undefined;
      activeAlerts[id].replaceState({
        ...state,
        ...(state.start ? { start: state.start } : {}),
        ...(duration !== undefined ? { duration } : {}),
      });
    }
  }

  function hasCapacityForNewAlerts() {
    return Object.keys(activeAlerts).length < alertLimit;
  }

  // if we don't have capacity for new alerts, return
  if (!hasCapacityForNewAlerts()) {
    return { recoveredAlerts: {}, newAlerts: {}, activeAlerts };
  }

  // look for new alerts and add until we hit capacity
  for (const id in alerts) {
    if (alerts.hasOwnProperty(id) && alerts[id].hasScheduledActions()) {
      // if this alert did not exist in previous run, it is considered "new"
      if (!existingAlertIds.has(id)) {
        activeAlerts[id] = alerts[id];
        newAlerts[id] = alerts[id];

        // Inject start time into alert state for new alerts
        const state = newAlerts[id].getState();
        newAlerts[id].replaceState({ ...state, start: currentTime, duration: '0' });

        if (!hasCapacityForNewAlerts()) {
          break;
        }
      }
    }
  }
  return { recoveredAlerts: {}, newAlerts, activeAlerts };
}
