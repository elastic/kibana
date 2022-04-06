/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsByStatusResponse, AlertsByStatusAgg, ParsedAlertsData } from './types';

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
        value: 22717,
      },
      {
        key: 'high',
        value: 5027,
      },
      {
        key: 'medium',
        value: 405,
      },
    ],
  },
  acknowledged: {
    total: 0,
    severities: [
      {
        key: 'critical',
        value: 0,
      },
      {
        value: 0,
        key: 'high',
      },
      {
        value: 0,
        key: 'medium',
      },
      {
        value: 0,
        key: 'low',
      },
    ],
  },
  closed: {
    total: 4,
    severities: [
      {
        key: 'high',
        value: 4,
      },
      {
        key: 'low',
        value: 0,
      },
    ],
  },
};
