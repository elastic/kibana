/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { millisToNanos } from '@kbn/event-log-plugin/server';
import { updateFlappingHistory } from './flapping_utils';

export interface UpdateValuesOpts<Alert> {
  alert: Alert;
  id: string;
  start?: string;
  duration?: string;
  end?: string;
  flappingHistory: boolean[];
}
interface PrepareAlertsOpts<Alert> {
  alerts: Record<string, Alert>;
  startTimes?: Record<string, string | undefined>;
  setEnd?: boolean;
  flappingHistories: Record<string, boolean[]>;
  flapping: boolean;
  updateValues: (opts: UpdateValuesOpts<Alert>) => void;
}
function prepareAlerts<Alert>({
  alerts,
  startTimes,
  flappingHistories,
  setEnd = false,
  flapping,
  updateValues,
}: PrepareAlertsOpts<Alert>) {
  const currentTime = new Date().toISOString();

  for (const id in alerts) {
    if (alerts.hasOwnProperty(id)) {
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
        alert: alerts[id],
        id,
        flappingHistory: updatedFlappingHistory,
        ...(start ? { start } : {}),
        ...(start && end ? { end } : {}),
        ...(duration !== undefined ? { duration } : {}),
      });
    }
  }
}

/**
 * For alerts categorized as new, set the start time, initialize the duration
 */
export function prepareNewAlerts<Alert>(
  alerts: Record<string, Alert>,
  flappingHistories: Record<string, boolean[]>,
  updateValues: (opts: UpdateValuesOpts<Alert>) => void
) {
  prepareAlerts({
    alerts,
    flappingHistories,
    flapping: true,
    updateValues,
  });
}

export function prepareOngoingAlerts<Alert>(
  alerts: Record<string, Alert>,
  startTimes: Record<string, string | undefined>,
  flappingHistories: Record<string, boolean[]>,
  updateValues: (opts: UpdateValuesOpts<Alert>) => void
) {
  prepareAlerts({
    alerts,
    startTimes,
    flappingHistories,
    flapping: false,
    updateValues,
  });
}

export function prepareRecoveredAlerts<Alert>(
  alerts: Record<string, Alert>,
  startTimes: Record<string, string | undefined>,
  flappingHistories: Record<string, boolean[]>,
  updateValues: (opts: UpdateValuesOpts<Alert>) => void
) {
  prepareAlerts({
    alerts,
    startTimes,
    setEnd: true,
    flappingHistories,
    flapping: true,
    updateValues,
  });
}
