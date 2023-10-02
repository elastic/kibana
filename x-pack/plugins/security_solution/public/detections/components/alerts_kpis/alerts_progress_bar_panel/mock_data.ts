/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
      value: 630,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 50,
      buckets: [
        {
          key: 'Host-v5biklvcy8',
          doc_count: 234,
        },
        {
          key: 'Host-5y1uprxfv2',
          doc_count: 186,
        },
        {
          key: 'Host-ssf1mhgy5c',
          doc_count: 150,
        },
      ],
    },
    missingFields: {
      doc_count: 10,
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
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    missingFields: {
      doc_count: 0,
    },
  },
};

export const query = {
  size: 0,
  query: {
    bool: {
      filter: [
        { bool: { filter: [], must: [], must_not: [], should: [] } },
        { range: { '@timestamp': { gte: from, lte: to } } },
      ],
    },
  },
  aggs: {
    alertsByGrouping: {
      terms: {
        field: 'host.name',
        size: 10,
      },
    },
    missingFields: {
      missing: {
        field: 'host.name',
      },
    },
  },
  runtime_mappings: undefined,
};

export const parsedAlerts = [
  {
    key: 'Host-v5biklvcy8',
    value: 234,
    label: 'Host-v5biklvcy8',
    percentage: 0.37142857142857144,
    percentageLabel: '37.1%',
  },
  {
    key: 'Host-5y1uprxfv2',
    value: 186,
    label: 'Host-5y1uprxfv2',
    percentage: 0.29523809523809524,
    percentageLabel: '29.5%',
  },
  {
    key: 'Host-ssf1mhgy5c',
    value: 150,
    label: 'Host-ssf1mhgy5c',
    percentage: 0.23809523809523808,
    percentageLabel: '23.8%',
  },
  {
    key: 'Other',
    value: 50,
    label: 'Other',
    percentage: 0.07936507936507936,
    percentageLabel: '7.9%',
  },
  { key: '-', value: 10, label: '-', percentage: 0.015873015873015872, percentageLabel: '1.6%' },
];

export const parsedLargeEmptyAlerts = [
  {
    key: 'Host-v5biklvcy8',
    value: 1,
    label: 'Host-v5biklvcy8',
    percentage: 0.0001,
    percentageLabel: '<1%',
  },
  { key: '-', value: 9999, label: '-', percentage: 0.9999, percentageLabel: '100%' },
];
