/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsByStatusResponse, AlertsByStatusAgg, ParsedAlertsData } from './types';

export const from = '2022-04-05T12:00:00.000Z';
export const to = '2022-04-08T12:00:00.000Z';

export const mockAlertsData: AlertsByStatusResponse<[], AlertsByStatusAgg> = {
  took: 4,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 10000,
      relation: 'gte',
    },
    hits: [],
  },
  aggregations: {
    alertsByStatus: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'open',
          doc_count: 28149,
          statusBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 22717,
              },
              {
                key: 'high',
                doc_count: 5027,
              },
              {
                key: 'medium',
                doc_count: 405,
              },
            ],
          },
        },
        {
          key: 'closed',
          doc_count: 4,
          statusBySeverity: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'high',
                doc_count: 4,
              },
              {
                key: 'low',
                doc_count: 0,
              },
            ],
          },
        },
      ],
    },
  },
};

export const parsedMockAlertsData: ParsedAlertsData = {
  open: {
    total: 28149,
    severities: [
      {
        key: 'low',
        label: 'Low',
        value: 22717,
      },
      {
        key: 'high',
        label: 'High',
        value: 5027,
      },
      {
        key: 'medium',
        label: 'Medium',
        value: 405,
      },
    ],
  },
  closed: {
    total: 4,
    severities: [
      {
        key: 'high',
        label: 'High',
        value: 4,
      },
      {
        key: 'low',
        label: 'Low',
        value: 0,
      },
    ],
  },
};

export const alertsByStatusQuery = {
  size: 0,
  query: {
    bool: {
      filter: [{ range: { '@timestamp': { gte: from, lte: to } } }],
    },
  },
  aggs: {
    alertsByStatus: {
      terms: {
        field: 'kibana.alert.workflow_status',
      },
      aggs: {
        statusBySeverity: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
    },
  },
};
