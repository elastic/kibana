/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// utility functions for handling dates

// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import dateMath from '@elastic/datemath';
import { TimeRange } from '../../../../../../src/plugins/data/common';
export function formatHumanReadableDate(ts: number) {
  return formatDate(ts, 'MMMM Do YYYY');
}

export function formatHumanReadableDateTime(ts: number): string {
  return formatDate(ts, 'MMMM Do YYYY, HH:mm');
}

export function formatHumanReadableDateTimeSeconds(ts: number) {
  return formatDate(ts, 'MMMM Do YYYY, HH:mm:ss');
}

export function validateTimeRange(time?: TimeRange): boolean {
  if (!time) return false;
  const momentDateFrom = dateMath.parse(time.from);
  const momentDateTo = dateMath.parse(time.to);
  return !!(momentDateFrom && momentDateFrom.isValid() && momentDateTo && momentDateTo.isValid());
}
