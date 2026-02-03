/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEvent } from '@kbn/alerting-v2-plugin/server/resources/alert_events';

export const createAlertEvent = (overrides?: Partial<AlertEvent>): AlertEvent => ({
  '@timestamp': new Date().toISOString(),
  scheduled_timestamp: new Date().toISOString(),
  rule: {
    id: 'test-rule-id',
    version: 1,
  },
  group_hash: 'test-group-hash',
  data: {},
  status: 'breached',
  source: 'test-source',
  type: 'alert',
  episode_id: 'test-episode-id',
  ...overrides,
});
