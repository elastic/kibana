/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const DAY = 24 * 60 * 60 * 1000;
const WEEK = DAY * 7;

/**
 * These contsants are used by the charting code to determine
 * what label should be applied to chart axes so as to help users
 * understand the timeseries data they're being shown.
 */
export const CHART_FORMAT_LIMITS = {
  DAY,
  FIFTEEN_DAYS: 1000 * 60 * 60 * 24 * 15,
  EIGHT_MINUTES: 1000 * 60 * 8,
  FOUR_YEARS: 4 * 12 * 4 * WEEK,
  THIRTY_SIX_HOURS: 1000 * 60 * 60 * 36,
  THREE_WEEKS: WEEK * 3,
};
