/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockStatusSeverityAlertCountersResult = {
  aggregations: {
    alertsByHost: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 304,
      buckets: [
        {
          key: 'Host-342m5gl1g2',
          doc_count: 291,
          hostBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 163,
              },
              {
                key: 'low',
                doc_count: 128,
              },
            ],
          },
        },
        {
          key: 'Host-4dbzugdlqd',
          doc_count: 139,
          hostBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 81,
              },
              {
                key: 'medium',
                doc_count: 58,
              },
            ],
          },
        },
        {
          key: 'Host-vns3hyykhu',
          doc_count: 129,
          hostBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 69,
              },
              {
                key: 'low',
                doc_count: 60,
              },
            ],
          },
        },
        {
          key: 'Host-56k7zf5kne',
          doc_count: 119,
          hostBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 61,
              },
              {
                key: 'low',
                doc_count: 58,
              },
            ],
          },
        },
      ],
    },
  },
};

export const mockStatusSeverityAlertCountersRequest = {
  aggs: {
    alertsByHost: {
      terms: {
        field: 'host.name',
        order: {
          _count: 'desc',
        },
        size: 4,
      },
      aggs: {
        hostBySeverity: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': {
              gte: '2022-03-02T10:13:37.853Z',
              lte: '2022-03-29T10:13:37.853Z',
            },
          },
        },
      ],
    },
  },
  size: 0,
};
