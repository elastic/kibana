/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertTransition {
  '@timestamp': string;
  alert_series_id: string;
  episode_id: string;
  start_state: string;
  end_state: string;
  rule_id: string;
}

export const createAlertTransition = (overrides?: Partial<AlertTransition>): AlertTransition => ({
  '@timestamp': new Date().toISOString(),
  alert_series_id: 'test-alert-series-id',
  episode_id: 'test-episode-id',
  start_state: 'inactive',
  end_state: 'active',
  rule_id: 'test-rule-id',
  ...overrides,
});
