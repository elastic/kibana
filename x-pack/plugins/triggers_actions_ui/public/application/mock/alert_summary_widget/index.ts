/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSummaryTimeRange } from '../../hooks/use_load_alert_summary';
import { Rule } from '../../../types';

export const mockRule = (): Rule => {
  return {
    id: '1',
    name: 'test rule',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '1s' },
    actions: [],
    params: { name: 'test rule type name' },
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    consumer: 'alerts',
    notifyWhen: 'onActiveAlert',
    executionStatus: {
      status: 'active',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    monitoring: {
      run: {
        history: [
          {
            success: true,
            duration: 1000000,
            timestamp: 1234567,
          },
          {
            success: true,
            duration: 200000,
            timestamp: 1234567,
          },
          {
            success: false,
            duration: 300000,
            timestamp: 1234567,
          },
        ],
        calculated_metrics: {
          success_ratio: 0.66,
          p50: 200000,
          p95: 300000,
          p99: 390000,
        },
        last_run: {
          timestamp: '2020-08-20T19:23:38Z',
          metrics: {
            duration: 500,
          },
        },
      },
    },
  };
};

export const mockAlertSummaryResponse = () => {
  return {
    activeAlertCount: 1,
    recoveredAlertCount: 1,
    activeAlerts: [
      { key_as_string: '1671321600000', key: 1671321600000, doc_count: 0 },
      { key_as_string: '1671408000000', key: 1671408000000, doc_count: 2 },
    ],
    recoveredAlerts: [
      { key_as_string: '2022-12-18T00:00:00.000Z', key: 1671321600000, doc_count: 0 },
      { key_as_string: '2022-12-19T00:00:00.000Z', key: 1671408000000, doc_count: 1 },
    ],
  };
};

export const mockAlertSummaryTimeRange: AlertSummaryTimeRange = {
  utcFrom: 'mockedUtcFrom',
  utcTo: 'mockedUtcTo',
  fixedInterval: 'mockedFixedInterval',
  title: 'mockedTitle',
};
