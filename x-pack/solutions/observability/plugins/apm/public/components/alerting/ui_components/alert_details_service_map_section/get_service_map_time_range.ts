/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const MINUTES_BEFORE_ALERT_START = 5;
const MINUTES_AFTER_ALERT_START = 10;
const MAX_ALERT_DURATION_MINUTES = 15;

export interface ServiceMapTimeRange {
  from: string;
  to: string;
}

/**
 * Returns a time range for the service map: 5 minutes before alert start and, for long
 * alerts (>15 min) or active alerts (no end), 10 minutes after alert start; for shorter
 * recovered alerts, through alert end. This keeps the preview focused on the period
 * the alert was firing so the symptomatic service appears as a node on the map.
 */
export function getServiceMapTimeRange(alertStart: string, alertEnd?: string): ServiceMapTimeRange {
  const start = moment(alertStart);
  const from = start.clone().subtract(MINUTES_BEFORE_ALERT_START, 'minutes');

  const endMoment = alertEnd ? moment(alertEnd) : null;
  const durationMinutes = endMoment ? endMoment.diff(start, 'minutes', true) : Infinity;

  const to =
    durationMinutes > MAX_ALERT_DURATION_MINUTES
      ? start.clone().add(MINUTES_AFTER_ALERT_START, 'minutes')
      : endMoment ?? start.clone().add(MINUTES_AFTER_ALERT_START, 'minutes');

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
