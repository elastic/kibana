/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertEvent {
  '@timestamp': string;
  alert_id: string;
  alert_series_id: string;
  'rule.id': string;
  status: string;
  source: string;
  tags: string[];
}

export const createAlertEvent = (overrides?: Partial<AlertEvent>): AlertEvent => ({
  '@timestamp': new Date().toISOString(),
  alert_id: 'test-alert-id',
  alert_series_id: 'test-alert-series-id',
  'rule.id': 'test-rule-id',
  status: 'active',
  source: 'test-source',
  tags: ['alert-tag-1', 'alert-tag-2'],
  ...overrides,
});
