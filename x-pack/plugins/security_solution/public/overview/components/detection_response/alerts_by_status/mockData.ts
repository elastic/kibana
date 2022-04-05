/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockStatusSeverityAlertCountersResult = {
  aggregations: {
    alertsByStatus: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'open',
          doc_count: 969,
          statusBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 538,
              },
              {
                key: 'medium',
                doc_count: 431,
              },
            ],
          },
        },
        {
          key: 'closed',
          doc_count: 7,
          statusBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 5,
              },
              {
                key: 'medium',
                doc_count: 2,
              },
            ],
          },
        },
        {
          key: 'acknowledged',
          doc_count: 6,
          statusBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 3,
              },
              {
                key: 'medium',
                doc_count: 3,
              },
            ],
          },
        },
      ],
    },
  },
};
