/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AlertsTypeData } from './types';

const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.000Z';

export const mockAlertsData = {
  took: 0,
  timeout: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 589,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    alertsByRule: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'Test rule 1',
          doc_count: 537,
          ruleByEventType: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'info',
                doc_count: 406,
              },
              {
                key: 'creation',
                doc_count: 131,
              },
            ],
          },
        },
        {
          key: 'Test rule 2',
          doc_count: 27,
          ruleByEventType: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'info',
                doc_count: 19,
              },
              {
                key: 'creation',
                doc_count: 8,
              },
            ],
          },
        },
        {
          key: 'Test rule 3',
          doc_count: 25,
          ruleByEventType: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'info',
                doc_count: 19,
              },
              {
                key: 'denied',
                doc_count: 6,
              },
            ],
          },
        },
      ],
    },
  },
};

export const mockAlertsEmptyData = {
  took: 0,
  timeout: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 0,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    alertsByRule: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
  },
};

export const query = {
  size: 0,
  query: {
    bool: {
      filter: [
        {
          bool: {
            filter: [],
            must: [],
            must_not: [],
            should: [],
          },
        },
        { range: { '@timestamp': { gte: from, lte: to } } },
      ],
    },
  },
  aggs: {
    alertsByRule: {
      terms: {
        field: 'kibana.alert.rule.name',
        size: 1000,
      },
      aggs: {
        ruleByEventType: {
          terms: {
            field: 'event.type',
            size: 1000,
          },
        },
      },
    },
  },
  runtime_mappings: undefined,
};

export const parsedAlerts: AlertsTypeData[] = [
  { rule: 'Test rule 1', type: 'Detection', value: 537, color: '#D36086' },
  { rule: 'Test rule 2', type: 'Detection', value: 27, color: '#D36086' },
  { rule: 'Test rule 3', type: 'Detection', value: 19, color: '#D36086' },
  { rule: 'Test rule 3', type: 'Prevention', value: 6, color: '#54B399' },
];
