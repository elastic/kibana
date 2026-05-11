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
  /**
   * Narrow, focused window that drives the service map graph query (services + edges).
   * Always `[alertStart − 5m, min(alertEnd ?? now, alertStart + 30m)]` so the graph
   * query stays cheap even for very long active alerts; service topology rarely
   * changes within such a window so the preview is still meaningful.
   */
  graph: ServiceMapTimeRange;
  /**
   * Wider window that drives the per-service badges query (alert counts + SLO stats).
   * Spans the full alert lifecycle: `[alertStart − 5m, alertEnd ?? now]`. This guarantees
   * the alert's document `@timestamp` is inside the range so the symptomatic service
   * always shows an alert badge — the badges query hits the (smaller) alerts index and
   * is much cheaper than the graph query, so widening it here is essentially free.
   */
  badges: ServiceMapTimeRange;
}

/**
 * Computes both the graph- and badges-time ranges for the alert details service map
 * preview. See {@link AlertServiceMapTimeRanges} for the rationale behind each.
 *
 * `nowMs` is parameterised purely so tests can pin the clock; production callers
 * can omit it.
 */
export function getServiceMapTimeRange(
  alertStart: string,
  alertEnd?: string,
  nowMs: number = Date.now()
): AlertServiceMapTimeRanges {
  const start = moment(alertStart);
  const from = start.clone().subtract(MINUTES_BEFORE_ALERT_START, 'minutes');

  const cap = start.clone().add(MAX_MINUTES_AFTER_ALERT_START_FOR_GRAPH, 'minutes');
  const lifecycleEnd = alertEnd ? moment(alertEnd) : moment(nowMs);

  // Graph window is capped to keep the graph query fast even on multi-hour alerts;
  // badges window mirrors the alert's lifecycle so the symptomatic service is included.
  const graphTo = moment.min(lifecycleEnd, cap);

  return {
    graph: { from: from.toISOString(), to: graphTo.toISOString() },
    badges: { from: from.toISOString(), to: lifecycleEnd.toISOString() },
  };
}
