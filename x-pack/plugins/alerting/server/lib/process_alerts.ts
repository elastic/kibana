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
import { updateFlappingHistory } from './flapping_utils';

interface ProcessAlertsOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
> {
  alerts: Record<string, Alert<State, Context>>;
  existingAlerts: Record<string, Alert<State, Context>>;
  previouslyRecoveredAlerts: Record<string, Alert<State, Context>>;
  hasReachedAlertLimit: boolean;
  alertLimit: number;
  // flag used to determine whether or not we want to push the flapping state on to the flappingHistory array
  setFlapping: boolean;
}
interface ProcessAlertsResult<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  // recovered alerts in the current rule run that were previously active
  currentRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
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
  previouslyRecoveredAlerts,
  hasReachedAlertLimit,
  alertLimit,
  setFlapping,
}: ProcessAlertsOpts<State, Context>): ProcessAlertsResult<
  State,
  Context,
  ActionGroupIds,
  RecoveryActionGroupId
> {
  return hasReachedAlertLimit
    ? processAlertsLimitReached(
        alerts,
        existingAlerts,
        previouslyRecoveredAlerts,
        alertLimit,
        setFlapping
      )
    : processAlertsHelper(alerts, existingAlerts, previouslyRecoveredAlerts, setFlapping);
}

function processAlertsHelper<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  alerts: Record<string, Alert<State, Context>>,
  existingAlerts: Record<string, Alert<State, Context>>,
  previouslyRecoveredAlerts: Record<string, Alert<State, Context>>,
  setFlapping: boolean
): ProcessAlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId> {
  const existingAlertIds = new Set(Object.keys(existingAlerts));
  const previouslyRecoveredAlertsIds = new Set(Object.keys(previouslyRecoveredAlerts));

  const currentTime = new Date().toISOString();
  const newAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {};
  const activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {};
  const currentRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {};
  const recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {};

  for (const id in alerts) {
    if (alerts.hasOwnProperty(id)) {
      // alerts with scheduled actions are considered "active"
      if (alerts[id].hasScheduledActions()) {
        activeAlerts[id] = alerts[id];

        // if this alert was not active in the previous run, we need to inject start time into the alert state
        if (!existingAlertIds.has(id)) {
          newAlerts[id] = alerts[id];
          const state = newAlerts[id].getState();
          newAlerts[id].replaceState({ ...state, start: currentTime, duration: '0' });

          if (setFlapping) {
            if (previouslyRecoveredAlertsIds.has(id)) {
              // this alert has flapped from recovered to active
              newAlerts[id].setFlappingHistory(previouslyRecoveredAlerts[id].getFlappingHistory());
              previouslyRecoveredAlertsIds.delete(id);
            }
            updateAlertFlappingHistory(newAlerts[id], true);
          }
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

          // this alert is still active
          if (setFlapping) {
            updateAlertFlappingHistory(activeAlerts[id], false);
          }
        }
      } else if (existingAlertIds.has(id)) {
        recoveredAlerts[id] = alerts[id];
        currentRecoveredAlerts[id] = alerts[id];

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
        // this alert has flapped from active to recovered
        if (setFlapping) {
          updateAlertFlappingHistory(recoveredAlerts[id], true);
        }
      }
    }
  }

  // alerts are still recovered
  for (const id of previouslyRecoveredAlertsIds) {
    recoveredAlerts[id] = previouslyRecoveredAlerts[id];
    if (setFlapping) {
      updateAlertFlappingHistory(recoveredAlerts[id], false);
    }
  }

  return { recoveredAlerts, currentRecoveredAlerts, newAlerts, activeAlerts };
}

function processAlertsLimitReached<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  alerts: Record<string, Alert<State, Context>>,
  existingAlerts: Record<string, Alert<State, Context>>,
  previouslyRecoveredAlerts: Record<string, Alert<State, Context>>,
  alertLimit: number,
  setFlapping: boolean
): ProcessAlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId> {
  const existingAlertIds = new Set(Object.keys(existingAlerts));
  const previouslyRecoveredAlertsIds = new Set(Object.keys(previouslyRecoveredAlerts));

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

      // this alert is still active
      if (setFlapping) {
        updateAlertFlappingHistory(activeAlerts[id], false);
      }
    }
  }

  function hasCapacityForNewAlerts() {
    return Object.keys(activeAlerts).length < alertLimit;
  }

  // if we don't have capacity for new alerts, return
  if (!hasCapacityForNewAlerts()) {
    return { recoveredAlerts: {}, currentRecoveredAlerts: {}, newAlerts: {}, activeAlerts };
  }

  // look for new alerts and add until we hit capacity
  for (const id in alerts) {
    if (alerts.hasOwnProperty(id) && alerts[id].hasScheduledActions()) {
      // if this alert did not exist in previous run, it is considered "new"
      if (!existingAlertIds.has(id)) {
        activeAlerts[id] = alerts[id];
        newAlerts[id] = alerts[id];
        // if this alert was not active in the previous run, we need to inject start time into the alert state
        const state = newAlerts[id].getState();
        newAlerts[id].replaceState({ ...state, start: currentTime, duration: '0' });

        if (setFlapping) {
          if (previouslyRecoveredAlertsIds.has(id)) {
            // this alert has flapped from recovered to active
            newAlerts[id].setFlappingHistory(previouslyRecoveredAlerts[id].getFlappingHistory());
          }
          updateAlertFlappingHistory(newAlerts[id], true);
        }

        if (!hasCapacityForNewAlerts()) {
          break;
        }
      }
    }
  }
  return { recoveredAlerts: {}, currentRecoveredAlerts: {}, newAlerts, activeAlerts };
}

export function updateAlertFlappingHistory<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>, state: boolean) {
  const updatedFlappingHistory = updateFlappingHistory(alert.getFlappingHistory() || [], state);
  alert.setFlappingHistory(updatedFlappingHistory);
}
