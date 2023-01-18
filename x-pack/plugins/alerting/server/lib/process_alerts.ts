/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { millisToNanos } from '@kbn/event-log-plugin/server';
import { cloneDeep } from 'lodash';
import { updateFlappingHistory } from './flapping_utils';

interface ProcessAlertsOpts<Alert> {
  /**
   * Active and recovered alerts that have been reported during the current rule execution
   */
  reportedAlerts: {
    active: Record<string, Alert>;
    recovered: Record<string, Alert>;
  };

  /**
   * Active and recovered alerts from previous rule execution
   */
  trackedAlerts: {
    active: Record<string, Alert>;
    recovered: Record<string, Alert>;
  };

  /**
   * Whether the alert circuit breaker has been reached
   */
  hasReachedAlertLimit: boolean;

  /**
   * Max number of allowed alerts
   */
  alertLimit: number;

  /**
   * Optional callback functions to get and set information within an Alert
   */
  callbacks?: {
    /**
     * Callback function to get flapping history for Alert
     */
    getFlappingHistory: (alert: Alert) => boolean[];

    /**
     * Callback function to get start time if it exists for Alert
     */
    getStartTime: (alert: Alert) => string | undefined;

    /**
     * Callback function to set values for Alert
     */
    updateAlertValues: ({
      alert,
      start,
      duration,
      end,
      flappingHistory,
    }: {
      alert: Alert;
      start?: string;
      duration?: string;
      end?: string;
      flappingHistory: boolean[];
    }) => void;
  };
}

interface ProcessAlertsResult<Alert> {
  /**
   * Alerts that are new in this execution cycle. Start time and initial duration are
   * set for these alerts. Flapping history is updated if setFlapping = true
   */
  newAlerts: Record<string, Alert>;

  /**
   * Alerts that are new or ongoing in this execution cycle. Duration is updated for
   * ongoing alerts. Flapping history is updated if setFlapping = true
   */
  activeAlerts: Record<string, Alert>;
  // recovered alerts in the current rule run that were previously active

  /**
   * Alerts that are recovered in this execution cycle. Duration is updated and end
   * time is set for these alerts. Flapping history is updated if setFlapping = true
   */
  currentRecoveredAlerts: Record<string, Alert>;

  /**
   * All recovered alerts, including those that have recovered during this execution
   * cycle and any recovered alerts that were previously tracked.
   */
  recoveredAlerts: Record<string, Alert>;
}

export function processAlerts<Alert>(opts: ProcessAlertsOpts<Alert>): ProcessAlertsResult<Alert> {
  return opts.hasReachedAlertLimit ? processAlertsLimitReached(opts) : processAlertsHelper(opts);
}

function processAlertsHelper<Alert>({
  reportedAlerts,
  trackedAlerts,
  callbacks,
}: ProcessAlertsOpts<Alert>): ProcessAlertsResult<Alert> {
  // Active alerts tracked from previous execution
  const previouslyActiveAlertIds = new Set(Object.keys(trackedAlerts.active));

  // Recovered alerts tracked from previous executions
  const previouslyRecoveredAlertIds = new Set(Object.keys(trackedAlerts.recovered));

  const currentTime = new Date().toISOString();
  const newAlerts: Record<string, Alert> = {};
  const activeAlerts: Record<string, Alert> = {};
  const currentRecoveredAlerts: Record<string, Alert> = {};
  const recoveredAlerts: Record<string, Alert> = {};

  // Process active alerts
  for (const id in reportedAlerts.active) {
    if (reportedAlerts.active.hasOwnProperty(id)) {
      activeAlerts[id] = reportedAlerts.active[id];

      // if this alert was not active in the previous run, we need to inject start time into the alert state
      if (!previouslyActiveAlertIds.has(id)) {
        newAlerts[id] = reportedAlerts.active[id];

        if (callbacks) {
          const start = currentTime;
          const duration = '0';

          let flappingHistory: boolean[] = [];
          if (previouslyRecoveredAlertIds.has(id)) {
            flappingHistory = callbacks.getFlappingHistory(trackedAlerts.recovered[id]);
            previouslyRecoveredAlertIds.delete(id);
          }

          const updatedFlappingHistory = updateFlappingHistory(flappingHistory, true);

          callbacks.updateAlertValues({
            alert: newAlerts[id],
            start,
            duration,
            flappingHistory: updatedFlappingHistory,
          });
        }
      } else {
        if (callbacks) {
          // this alert did exist in previous run
          // get the start time from the tracked alert and if it exists, calculate
          // an updated duration
          const start = callbacks.getStartTime(trackedAlerts.active[id]);

          let duration: string | undefined;
          if (start) {
            const durationInMs = new Date(currentTime).valueOf() - new Date(start).valueOf();
            duration = start ? millisToNanos(durationInMs) : undefined;
          }

          const flappingHistory = callbacks.getFlappingHistory(trackedAlerts.active[id]);
          const updatedFlappingHistory = updateFlappingHistory(flappingHistory, false);

          callbacks.updateAlertValues({
            alert: activeAlerts[id],
            start,
            duration,
            flappingHistory: updatedFlappingHistory,
          });
        }
      }
    }
  }

  // Process recovered alerts
  for (const id in reportedAlerts.recovered) {
    if (reportedAlerts.recovered.hasOwnProperty(id)) {
      recoveredAlerts[id] = reportedAlerts.recovered[id];
      currentRecoveredAlerts[id] = reportedAlerts.recovered[id];

      if (callbacks) {
        // get the start time from the recovered alert and if it exists, calculate
        // an updated duration
        const start = callbacks.getStartTime(reportedAlerts.recovered[id]);
        let duration: string | undefined;
        if (start) {
          const durationInMs = new Date(currentTime).valueOf() - new Date(start).valueOf();
          duration = start ? millisToNanos(durationInMs) : undefined;
        }

        const flappingHistory = callbacks.getFlappingHistory(reportedAlerts.recovered[id]);
        const updatedFlappingHistory = updateFlappingHistory(flappingHistory, true);

        callbacks.updateAlertValues({
          alert: recoveredAlerts[id],
          duration,
          ...(start ? { end: currentTime } : {}),
          flappingHistory: updatedFlappingHistory,
        });
      }
    }
  }

  // alerts are still recovered
  for (const id of previouslyRecoveredAlertIds) {
    recoveredAlerts[id] = trackedAlerts.recovered[id];

    if (callbacks) {
      const flappingHistory = callbacks.getFlappingHistory(recoveredAlerts[id]);
      const updatedFlappingHistory = updateFlappingHistory(flappingHistory, false);
      callbacks.updateAlertValues({
        alert: recoveredAlerts[id],
        flappingHistory: updatedFlappingHistory,
      });
    }
  }

  return { recoveredAlerts, currentRecoveredAlerts, newAlerts, activeAlerts };
}

function processAlertsLimitReached<Alert>({
  reportedAlerts,
  trackedAlerts,
  alertLimit,
  callbacks,
}: ProcessAlertsOpts<Alert>): ProcessAlertsResult<Alert> {
  // Active alerts tracked from previous execution
  const previouslyActiveAlertIds = new Set(Object.keys(trackedAlerts.active));

  // Recovered alerts tracked from previous executions
  const previouslyRecoveredAlertIds = new Set(Object.keys(trackedAlerts.recovered));

  // When the alert limit has been reached,
  // - skip determination of recovered alerts
  // - pass through all existing alerts as active
  // - add any new alerts, up to the max allowed

  const currentTime = new Date().toISOString();
  const newAlerts: Record<string, Alert> = {};

  // all existing alerts stay active
  const activeAlerts: Record<string, Alert> = cloneDeep(trackedAlerts.active);

  // update duration for existing alerts
  for (const id in activeAlerts) {
    if (activeAlerts.hasOwnProperty(id)) {
      if (reportedAlerts.active.hasOwnProperty(id)) {
        activeAlerts[id] = reportedAlerts.active[id];
      }

      if (callbacks) {
        const start = callbacks.getStartTime(trackedAlerts.active[id]);
        let duration: string | undefined;
        if (start) {
          const durationInMs = new Date(currentTime).valueOf() - new Date(start).valueOf();
          duration = start ? millisToNanos(durationInMs) : undefined;
        }

        const flappingHistory = callbacks.getFlappingHistory(activeAlerts[id]);
        const updatedFlappingHistory = updateFlappingHistory(flappingHistory, false);

        callbacks.updateAlertValues({
          alert: activeAlerts[id],
          duration,
          flappingHistory: updatedFlappingHistory,
        });
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
  for (const id in reportedAlerts.active) {
    if (reportedAlerts.active.hasOwnProperty(id)) {
      // if this alert did not exist in previous run, it is considered "new"
      if (!previouslyActiveAlertIds.has(id)) {
        activeAlerts[id] = reportedAlerts.active[id];
        newAlerts[id] = reportedAlerts.active[id];

        if (callbacks) {
          // if this alert was not active in the previous run, we need to inject start time into the alert state
          const start = currentTime;
          const duration = '0';
          const flappingHistory = previouslyRecoveredAlertIds.has(id)
            ? callbacks.getFlappingHistory(trackedAlerts.recovered[id])
            : [];

          const updatedFlappingHistory = updateFlappingHistory(flappingHistory, true);

          callbacks.updateAlertValues({
            alert: newAlerts[id],
            start,
            duration,
            flappingHistory: updatedFlappingHistory,
          });
        }

        if (!hasCapacityForNewAlerts()) {
          break;
        }
      }
    }
  }
  return { recoveredAlerts: {}, currentRecoveredAlerts: {}, newAlerts, activeAlerts };
}
