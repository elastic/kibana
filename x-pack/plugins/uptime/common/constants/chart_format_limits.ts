/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const DAY = 24 * 60 * 60 * 1000;
const WEEK = DAY * 7;

export const CHART_FORMAT_LIMITS = {
  DAY,
  FOUR_DAYS: 1000 * 60 * 60 * 24 * 4,
  FOUR_MINUTES: 1000 * 60 * 4,
  FOUR_YEARS: 4 * 12 * 4 * WEEK,
  HOUR: 1000 * 60 * 60,
  THIRTY_SIX_HOURS: 1000 * 60 * 60 * 36,
  WEEK,
};
