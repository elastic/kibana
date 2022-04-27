/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildVulnerableUserAggregationQuery } from './use_user_alerts_items';

export const mockVulnerableUsersBySeverityResult = {
  aggregations: {
    usersBySeverity: {
      buckets: [
        {
          key: 'crffn20qcs',
          doc_count: 4,
          high: {
            doc_count: 1,
          },
          critical: {
            doc_count: 4,
          },
          low: {
            doc_count: 1,
          },
          medium: {
            doc_count: 1,
          },
        },
        {
          key: 'd058hziijl',
          doc_count: 4,
          high: {
            doc_count: 11,
          },
          critical: {
            doc_count: 1,
          },
          low: {
            doc_count: 1,
          },
          medium: {
            doc_count: 1,
          },
        },
        {
          key: 'nenha4bdhv',
          doc_count: 4,
          high: {
            doc_count: 1,
          },
          critical: {
            doc_count: 1,
          },
          low: {
            doc_count: 3,
          },
          medium: {
            doc_count: 3,
          },
        },
        {
          key: 'u68nq414uw',
          doc_count: 2,
          high: {
            doc_count: 1,
          },
          critical: {
            doc_count: 0,
          },
          low: {
            doc_count: 10,
          },
          medium: {
            doc_count: 0,
          },
        },
      ],
    },
  },
};

export const parsedVulnerableUserAlertsResult = [
  {
    totalAlerts: 4,
    critical: 4,
    high: 1,
    userName: 'crffn20qcs',
    low: 1,
    medium: 1,
  },
  {
    totalAlerts: 4,
    critical: 1,
    high: 11,
    userName: 'd058hziijl',
    low: 1,
    medium: 1,
  },
  {
    totalAlerts: 4,
    critical: 1,
    high: 1,
    userName: 'nenha4bdhv',
    low: 3,
    medium: 3,
  },
  {
    totalAlerts: 2,
    critical: 0,
    high: 1,
    userName: 'u68nq414uw',
    low: 10,
    medium: 0,
  },
];

export const mockQuery = () => ({
  query: buildVulnerableUserAggregationQuery({
    from: '2020-07-07T08:20:18.966Z',
    to: '2020-07-08T08:20:18.966Z',
  }),
  indexName: 'signal-alerts',
  skip: false,
});
