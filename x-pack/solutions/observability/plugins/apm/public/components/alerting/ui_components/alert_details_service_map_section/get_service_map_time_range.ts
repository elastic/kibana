/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const MINUTES_BEFORE_ALERT_START = 5;
const MAX_MINUTES_AFTER_ALERT_START_FOR_GRAPH = 30;

export interface ServiceMapTimeRange {
  from: string;
  to: string;
}

export interface AlertServiceMapTimeRanges {
  /** Graph window: `[alertStart − 5m, min(alertEnd ?? now, alertStart + 30m)]`. */
  graph: ServiceMapTimeRange;
  /** Badges window: `[alertStart − 5m, alertEnd ?? now]` — full alert lifecycle. */
  badges: ServiceMapTimeRange;
}

/** Computes graph + badges time ranges for the alert details preview. `nowMs` is injectable for tests. */
export function getServiceMapTimeRange(
  alertStart: string,
  alertEnd?: string,
  nowMs: number = Date.now()
): AlertServiceMapTimeRanges {
  const start = moment(alertStart);
  const from = start.clone().subtract(MINUTES_BEFORE_ALERT_START, 'minutes');

  const cap = start.clone().add(MAX_MINUTES_AFTER_ALERT_START_FOR_GRAPH, 'minutes');
  const lifecycleEnd = alertEnd ? moment(alertEnd) : moment(nowMs);
  const graphTo = moment.min(lifecycleEnd, cap);

  return {
    graph: { from: from.toISOString(), to: graphTo.toISOString() },
    badges: { from: from.toISOString(), to: lifecycleEnd.toISOString() },
  };
}
