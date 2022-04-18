/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildVulnerableHostAggregationQuery } from './use_host_alerts_items';

export const mockVulnerableHostsBySeverityResult = {
  aggregations: {
    hostsBySeverity: {
      buckets: [
        {
          key: 'Host-342m5gl1g2',
          doc_count: 100,
          high: {
            doc_count: 50,
          },
          critical: {
            doc_count: 5,
          },
          low: {
            doc_count: 40,
          },
          medium: {
            doc_count: 5,
          },
        },
        {
          key: 'Host-vns3hyykhu',
          doc_count: 104,
          high: {
            doc_count: 100,
          },
          critical: {
            doc_count: 4,
          },
          low: {
            doc_count: 0,
          },
          medium: {
            doc_count: 0,
          },
        },
        {
          key: 'Host-awafztonav',
          doc_count: 108,
          high: {
            doc_count: 50,
          },
          critical: {
            doc_count: 4,
          },
          low: {
            doc_count: 50,
          },
          medium: {
            doc_count: 4,
          },
        },
        {
          key: 'Host-56k7zf5kne',
          doc_count: 128,
          high: {
            doc_count: 6,
          },
          critical: {
            doc_count: 1,
          },
          low: {
            doc_count: 59,
          },
          medium: {
            doc_count: 62,
          },
        },
      ],
    },
  },
};

export const parsedVulnerableHostsAlertsResult = [
  {
    hostName: 'Host-342m5gl1g2',
    totalAlerts: 100,
    critical: 5,
    high: 50,
    low: 40,
    medium: 5,
  },
  {
    hostName: 'Host-vns3hyykhu',
    totalAlerts: 104,
    critical: 4,
    high: 100,
    low: 0,
    medium: 0,
  },
  {
    hostName: 'Host-awafztonav',
    totalAlerts: 108,
    critical: 4,
    high: 50,
    low: 50,
    medium: 4,
  },
  {
    hostName: 'Host-56k7zf5kne',
    totalAlerts: 128,
    critical: 1,
    high: 6,
    low: 59,
    medium: 62,
  },
];

export const mockQuery = () => ({
  query: buildVulnerableHostAggregationQuery({
    from: '2020-07-07T08:20:18.966Z',
    to: '2020-07-08T08:20:18.966Z',
  }),
  indexName: 'signal-alerts',
  skip: false,
});
