/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const DAY = 24 * 60 * 60 * 1000;
const WEEK = DAY * 7;

export const CHART_FORMAT_LIMITS = {
  HOUR: 1000 * 60 * 60,
  FOUR_DAYS: 4 * 24 * 60 * 60 * 1000,
  DAY,
  WEEK,
  FOUR_YEARS: 4 * 12 * 4 * WEEK,
};
