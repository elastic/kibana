/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DAYS_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function twoDaysAgo(): Date {
  const now = new Date();
  now.setTime(now.getTime() - 2 * DAYS_IN_MILLISECONDS);
  return now;
}
