/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// utility functions for handling dates

// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';

export function formatHumanReadableDate(ts: number) {
  return formatDate(ts, 'MMMM Do YYYY');
}

export function formatHumanReadableDateTime(ts: number) {
  return formatDate(ts, 'MMMM Do YYYY, HH:mm');
}

export function formatHumanReadableDateTimeSeconds(ts: number) {
  return formatDate(ts, 'MMMM Do YYYY, HH:mm:ss');
}
