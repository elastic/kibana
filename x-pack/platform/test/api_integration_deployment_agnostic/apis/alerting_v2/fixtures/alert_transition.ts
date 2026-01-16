/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertTransition } from '@kbn/alerting-v2-plugin/server/resources/alert_transitions';

export const createAlertTransition = (overrides?: Partial<AlertTransition>): AlertTransition => ({
  '@timestamp': new Date().toISOString(),
  alert_series_id: 'test-alert-series-id',
  episode_id: 'test-episode-id',
  start_state: 'inactive',
  end_state: 'active',
  rule_id: 'test-rule-id',
  ...overrides,
});
