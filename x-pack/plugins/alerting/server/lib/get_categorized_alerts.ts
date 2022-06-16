/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { millisToNanos } from '@kbn/event-log-plugin/server';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

export function getCategorizedAlerts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
>(
  alerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>,
  originalAlertIds: Set<string>
): {
  newAlerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>;
} {
  const currentTime = new Date().toISOString();
  const newAlerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>> = {};
  const activeAlerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>> = {};
  const recoveredAlerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>> = {};
  for (const id in alerts) {
    if (alerts.hasOwnProperty(id)) {
      if (alerts[id].hasScheduledActions()) {
        activeAlerts[id] = alerts[id];
        if (!originalAlertIds.has(id)) {
          newAlerts[id] = alerts[id];

          // Inject start time into alert state for new alerts
          const state = activeAlerts[id].getState();
          activeAlerts[id].replaceState({ ...state, start: currentTime });
        } else {
          // Calculate duration to date for active alerts
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
