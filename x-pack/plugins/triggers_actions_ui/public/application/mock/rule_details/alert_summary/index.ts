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

export function mockChartData(): AlertChartData[] {
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
}

export const mockAggsResponse = () => {
  return {
    aggregations: {
      total: {
        buckets: { totalActiveAlerts: { doc_count: 1 }, totalRecoveredAlerts: { doc_count: 7 } },
      },
      statusPerDay: {
        buckets: [
          {
            key_as_string: '2022-07-18T00:00:00.000Z',
            key: 1658102400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-19T00:00:00.000Z',
            key: 1658188800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-20T00:00:00.000Z',
            key: 1658275200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-21T00:00:00.000Z',
            key: 1658361600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-22T00:00:00.000Z',
            key: 1658448000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-23T00:00:00.000Z',
            key: 1658534400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-24T00:00:00.000Z',
            key: 1658620800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-25T00:00:00.000Z',
            key: 1658707200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-26T00:00:00.000Z',
            key: 1658793600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-27T00:00:00.000Z',
            key: 1658880000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-28T00:00:00.000Z',
            key: 1658966400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-29T00:00:00.000Z',
            key: 1659052800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-30T00:00:00.000Z',
            key: 1659139200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-31T00:00:00.000Z',
            key: 1659225600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-01T00:00:00.000Z',
            key: 1659312000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-02T00:00:00.000Z',
            key: 1659398400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-03T00:00:00.000Z',
            key: 1659484800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-04T00:00:00.000Z',
            key: 1659571200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-05T00:00:00.000Z',
            key: 1659657600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-06T00:00:00.000Z',
            key: 1659744000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-07T00:00:00.000Z',
            key: 1659830400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-08T00:00:00.000Z',
            key: 1659916800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-09T00:00:00.000Z',
            key: 1660003200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-10T00:00:00.000Z',
            key: 1660089600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-11T00:00:00.000Z',
            key: 1660176000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-12T00:00:00.000Z',
            key: 1660262400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-13T00:00:00.000Z',
            key: 1660348800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-14T00:00:00.000Z',
            key: 1660435200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-15T00:00:00.000Z',
            key: 1660521600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-16T00:00:00.000Z',
            key: 1660608000000,
            doc_count: 6,
            alertStatus: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'recovered', doc_count: 6 }],
            },
          },
          {
            key_as_string: '2022-08-17T00:00:00.000Z',
            key: 1660694400000,
            doc_count: 2,
            alertStatus: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'active', doc_count: 1 },
                { key: 'recovered', doc_count: 1 },
              ],
            },
          },
        ],
      },
    },
  };
};
