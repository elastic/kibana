/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = 24 * 60 * 60 * 1000;
const WEEK = DAY * 7;
const MONTH = WEEK * 4;

/**
 * These constants are used by the charting code to determine
 * what label should be applied to chart axes so as to help users
 * understand the timeseries data they're being shown.
 */
export const CHART_FORMAT_LIMITS = {
  DAY,
  EIGHT_MINUTES: MINUTE * 8,
  FOUR_YEARS: 4 * 12 * 4 * WEEK,
  THIRTY_SIX_HOURS: HOUR * 36,
  THREE_WEEKS: WEEK * 3,
  SIX_MONTHS: MONTH * 7,
  NINE_DAYS: DAY * 9,
};
