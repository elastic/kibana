/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
