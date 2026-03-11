/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const SERVICE_MAP_MAX_RANGE_MINUTES = 15;

export interface ServiceMapTimeRange {
  from: string;
  to: string;
}

/**
 * Returns a time range for the service map, capping the duration to the first 15 minutes
 * when the alert duration is longer. Use this so the service map always shows a manageable
 * window (e.g. 1pm–2pm alert → use 1pm–1:15pm; 1pm–1:05pm → use full 1pm–1:05pm).
 * To use the full alert range instead, pass the padded range through without this helper.
 */
export function getServiceMapTimeRange(from: string, to: string): ServiceMapTimeRange {
  const start = moment(from);
  const end = moment(to);
  const durationMs = end.valueOf() - start.valueOf();
  const maxDurationMs = SERVICE_MAP_MAX_RANGE_MINUTES * 60 * 1000;

  const cappedEnd =
    durationMs > maxDurationMs ? start.clone().add(SERVICE_MAP_MAX_RANGE_MINUTES, 'minutes') : end;

  return {
    from: start.toISOString(),
    to: cappedEnd.toISOString(),
  };
}
