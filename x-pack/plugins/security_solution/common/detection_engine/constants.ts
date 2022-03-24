/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum RULE_PREVIEW_INVOCATION_COUNT {
  HOUR = 20,
  DAY = 24,
  WEEK = 168,
  MONTH = 30,
}

export enum RULE_PREVIEW_INTERVAL {
  HOUR = '5m',
  DAY = '1h',
  WEEK = '1h',
  MONTH = '1d',
}

export enum RULE_PREVIEW_FROM {
  HOUR = 'now-6m',
  DAY = 'now-65m',
  WEEK = 'now-65m',
  MONTH = 'now-25h',
}
