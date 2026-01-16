/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEvent } from '../../../../../plugins/shared/alerting_v2/server/resources/alert_events';

export const createAlertEvent = (overrides?: Partial<AlertEvent>): AlertEvent => ({
  '@timestamp': new Date().toISOString(),
  scheduled_timestamp: new Date().toISOString(),
  alert_id: 'test-alert-id',
  alert_series_id: 'test-alert-series-id',
  parent_rule_id: undefined,
  rule: {
    id: 'test-rule-id',
    tags: [],
  },
  grouping: {
    key: 'instance.id',
    value: 'i-1234567890abcdef0',
  },
  data: {},
  status: 'active',
  source: 'test-source',
  tags: ['alert-tag-1', 'alert-tag-2'],
  ...overrides,
});
