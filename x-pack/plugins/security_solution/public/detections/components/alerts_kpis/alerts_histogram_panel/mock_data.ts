/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const stackedByBooleanField = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: {
      value: 3,
      relation: 'eq',
    },
    hits: [],
  },
  timeout: false,
  aggregations: {
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 1,
          key_as_string: 'true',
          doc_count: 2683,
          alerts: {
            buckets: [
              { key_as_string: '2022-05-10T15:34:48.075Z', key: 1652196888075, doc_count: 0 },
              { key_as_string: '2022-05-10T16:19:48.074Z', key: 1652199588074, doc_count: 0 },
              { key_as_string: '2022-05-10T17:04:48.073Z', key: 1652202288073, doc_count: 0 },
            ],
          },
        },
      ],
    },
  },
};

export const result = [
  { x: 1652196888075, y: 0, g: 'true' },
  { x: 1652199588074, y: 0, g: 'true' },
  { x: 1652202288073, y: 0, g: 'true' },
];

export const stackedByTextField = {
  took: 1,
  timeout: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: {
      value: 3,
      relation: 'eq',
    },
    hits: [],
  },
  aggregations: {
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'MacBook-Pro.local',
          doc_count: 2706,
          alerts: {
            buckets: [
              { key_as_string: '2022-05-10T15:34:48.075Z', key: 1652196888075, doc_count: 0 },
              { key_as_string: '2022-05-10T16:19:48.074Z', key: 1652199588074, doc_count: 0 },
              { key_as_string: '2022-05-10T17:04:48.073Z', key: 1652202288073, doc_count: 0 },
            ],
          },
        },
      ],
    },
  },
};

export const textResult = [
  { x: 1652196888075, y: 0, g: 'MacBook-Pro.local' },
  { x: 1652199588074, y: 0, g: 'MacBook-Pro.local' },
  { x: 1652202288073, y: 0, g: 'MacBook-Pro.local' },
];
