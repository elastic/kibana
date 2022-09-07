/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '../../../../types';
import { AlertChartData } from '../../../sections/rule_details/components/alert_summary';

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
      execution: {
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
          p99: 300000,
        },
      },
    },
  };
};

export const mockChartData = (): AlertChartData[] => {
  return [
    {
      date: 1660608000000,
      count: 6,
      status: 'recovered',
    },
    {
      date: 1660694400000,
      count: 1,
      status: 'recovered',
    },
    {
      date: 1660694400000,
      count: 1,
      status: 'active',
    },
    {
      date: 1658102400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658188800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658275200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658361600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658448000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658534400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658620800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658707200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658793600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658880000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658966400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659052800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659139200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659225600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659312000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659398400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659484800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659571200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659657600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659744000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659830400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659916800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660003200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660089600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660176000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660262400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660348800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660435200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660521600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660694400000,
      count: 4,
      status: 'total',
    },
  ];
};
