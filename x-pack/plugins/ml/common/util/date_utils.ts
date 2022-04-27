/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// utility functions for handling dates

import dateMath from '@kbn/datemath';
import { formatDate } from '@elastic/eui';
import { TimeRange } from '@kbn/data-plugin/common';
import { TIME_FORMAT } from '../constants/time_format';

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

export const timeFormatter = (value: number) => {
  return formatDate(value, TIME_FORMAT);
};
