/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { millisToNanos } from '@kbn/event-log-plugin/server';
import { updateFlappingHistory } from './flapping_utils';

export interface UpdateValuesOpts {
  id: string;
  start?: string;
  duration?: string;
  end?: string;
  flappingHistory: boolean[];
}
interface PrepareAlertsOpts {
  alertIds: string[];
  startTimes?: Record<string, string | undefined>;
  setEnd?: boolean;
  flappingHistories: Record<string, boolean[]>;
  flapping: boolean;
  updateValues: (opts: UpdateValuesOpts) => void;
}
function prepareAlerts({
  alertIds,
  startTimes,
  flappingHistories,
  setEnd = false,
  flapping,
  updateValues,
}: PrepareAlertsOpts) {
  const currentTime = new Date().toISOString();

  for (const id of alertIds) {
    // If no start times are defined, set start time and initial duration
    let start;
    let startTime;
    let duration;
    let end;

    if (!startTimes) {
      start = currentTime;
      duration = '0';
    } else {
      startTime = startTimes[id];
      start = startTime ? startTime : undefined;
      const durationInMs =
        new Date(currentTime).valueOf() - new Date(startTime as string).valueOf();
      duration = startTime ? millisToNanos(durationInMs) : undefined;
    }

    if (setEnd) {
      end = currentTime;
    }

    const flappingHistory = flappingHistories[id] ? flappingHistories[id] : [];
    const updatedFlappingHistory = updateFlappingHistory(flappingHistory, flapping);

    updateValues({
      id,
      flappingHistory: updatedFlappingHistory,
      ...(start ? { start } : {}),
      ...(start && end ? { end } : {}),
      ...(duration !== undefined ? { duration } : {}),
    });
  }
}

/**
 * For alerts categorized as new, set the start time, initialize the duration
 */
export function prepareNewAlerts(
  newAlertIds: string[],
  flappingHistories: Record<string, boolean[]>,
  updateValues: (opts: UpdateValuesOpts) => void
) {
  prepareAlerts({
    alertIds: newAlertIds,
    flappingHistories,
    flapping: true,
    updateValues,
  });
}

export function prepareOngoingAlerts(
  ongoingAlertIds: string[],
  startTimes: Record<string, string | undefined>,
  flappingHistories: Record<string, boolean[]>,
  updateValues: (opts: UpdateValuesOpts) => void
) {
  prepareAlerts({
    alertIds: ongoingAlertIds,
    startTimes,
    flappingHistories,
    flapping: false,
    updateValues,
  });
}

export function prepareRecoveredAlerts(
  recoveredAlertIds: string[],
  startTimes: Record<string, string | undefined>,
  flappingHistories: Record<string, boolean[]>,
  updateValues: (opts: UpdateValuesOpts) => void
) {
  prepareAlerts({
    alertIds: recoveredAlertIds,
    startTimes,
    setEnd: true,
    flappingHistories,
    flapping: true,
    updateValues,
  });
}

interface PrepareAllAlerts<Alert> {
  newAlerts: Record<string, Alert>;
  trackedRecoveredAlerts: Record<string, Alert>;
  getFlappingHistories: (alerts: Record<string, Alert>) => Record<string, boolean[] | undefined>;
}

export function prepareAllAlerts<Alert>({
  newAlerts,
  trackedRecoveredAlerts,
  getFlappingHistories,
}: PrepareAllAlerts<Alert>) {
  // For alerts categorized as new, set the start time and duration
  // and check to see if it's a flapping alert
  prepareNewAlerts(
    Object.keys(newAlerts),
    // For new alerts we look at the tracked recovered alerts
    // to see if that alert has previously recovered and if so,
    // carry over the flapping history
    getFlappingHistories(trackedRecoveredAlerts),
    // Callback function for each new alert to set start time and duration
    (opts: UpdateValuesOpts) => {
      updateAlertValues(opts, categorized.new[opts.id]);
      activeAlerts[opts.id] = categorized.new[opts.id];
    }
  );
}
