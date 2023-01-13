/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

export interface CategorizeAlertTypes<Alert> {
  active: Record<string, Alert>;
  recovered: Record<string, Alert>;
}

interface CategorizeAlertsOpts<Alert> {
  /**
   * Active and recovered alerts that have been reported in the current rule execution
   */
  reportedAlerts: CategorizeAlertTypes<Alert>;

  /**
   * Active alerts from previous rule execution
   */
  trackedAlerts: Record<string, Alert>;

  /**
   * Whether the alert circuit breaker has been reached
   */
  hasReachedAlertLimit: boolean;

  /**
   * Max number of allowed alerts
   */
  alertLimit: number;
}
interface CategorizeAlertsResult<Alert> {
  new: Record<string, Alert>;
  ongoing: Record<string, Alert>;
  // alerts that just recovered in the current execution
  recovered: Record<string, Alert>;
}

export function categorizeAlerts<Alert>({
  reportedAlerts,
  trackedAlerts,
  hasReachedAlertLimit,
  alertLimit,
}: CategorizeAlertsOpts<Alert>): CategorizeAlertsResult<Alert> {
  return hasReachedAlertLimit
    ? categorizeAlertsLimitReached(reportedAlerts, trackedAlerts, alertLimit)
    : categorizeAlertsHelper(reportedAlerts, trackedAlerts);
}

function categorizeAlertsHelper<Alert>(
  reportedAlerts: CategorizeAlertTypes<Alert>,
  trackedAlerts: Record<string, Alert>
): CategorizeAlertsResult<Alert> {
  // Alerts tracked from previous execution
  const trackedActiveAlertIds = new Set(Object.keys(trackedAlerts));

  // Alerts that were active this execution but not the previous
  const newAlerts: Record<string, Alert> = {};

  // Alerts that were active this execution and the previous execution
  const ongoingAlerts: Record<string, Alert> = {};

  // Alerts that were active during the previous execution but not this execution
  const recoveredAlerts: Record<string, Alert> = {};

  // Iterate over the reported active alerts to determine if they are new or ongoing
  for (const id in reportedAlerts.active) {
    if (reportedAlerts.active.hasOwnProperty(id)) {
      if (!trackedActiveAlertIds.has(id)) {
        // this active alert was not active in previous execution
        newAlerts[id] = reportedAlerts.active[id];
      } else {
        // this active alert was active in previous execution
        ongoingAlerts[id] = reportedAlerts.active[id];
      }
    }
  }

  // Iterate over the reported recovered alerts to determine if they just recovered
  for (const id in reportedAlerts.recovered) {
    if (reportedAlerts.recovered.hasOwnProperty(id)) {
      recoveredAlerts[id] = reportedAlerts.recovered[id];
    }
  }

  return { new: newAlerts, ongoing: ongoingAlerts, recovered: recoveredAlerts };
}

function categorizeAlertsLimitReached<Alert>(
  reportedAlerts: CategorizeAlertTypes<Alert>,
  trackedAlerts: Record<string, Alert>,
  alertLimit: number
): CategorizeAlertsResult<Alert> {
  // Alerts tracked from previous execution
  const trackedActiveAlertIds = new Set(Object.keys(trackedAlerts));

  // When the alert limit has been reached,
  // - skip determination of recovered alerts
  // - pass through all existing alerts as active
  // - add any new alerts, up to the max allowed

  // Alerts that were active this execution but not the previous
  const newAlerts: Record<string, Alert> = {};

  // Alerts that were active this execution and the previous execution
  const activeAlerts: Record<string, Alert> = cloneDeep(trackedAlerts);

  for (const id in activeAlerts) {
    if (activeAlerts.hasOwnProperty(id)) {
      if (reportedAlerts.active.hasOwnProperty(id)) {
        activeAlerts[id] = reportedAlerts.active[id];
      }
    }
  }

  function hasCapacityForNewAlerts() {
    return Object.keys(activeAlerts).length + Object.keys(newAlerts).length < alertLimit;
  }

  // if we don't have capacity for new alerts, return
  if (!hasCapacityForNewAlerts()) {
    return { recovered: {}, new: {}, ongoing: activeAlerts };
  }

  // look for new alerts and add until we hit capacity
  for (const id in reportedAlerts.active) {
    if (reportedAlerts.active.hasOwnProperty(id)) {
      // if this alert did not exist in previous run, it is considered "new"
      if (!trackedActiveAlertIds.has(id)) {
        newAlerts[id] = reportedAlerts.active[id];

        if (!hasCapacityForNewAlerts()) {
          break;
        }
      }
    }
  }
  return { recovered: {}, new: newAlerts, ongoing: activeAlerts };
}
