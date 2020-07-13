/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const bucketsA = [
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5, values: [{ key: 95.0, value: 0.5 }] },
  },
  {
    doc_count: 3,
    aggregatedValue: { value: 1.0, values: [{ key: 95.0, value: 1.0 }] },
    key_as_string: new Date(1577858400000).toISOString(),
  },
];

const bucketsB = [
  {
    doc_count: 4,
    aggregatedValue: { value: 2.5, values: [{ key: 99.0, value: 2.5 }] },
  },
  {
    doc_count: 5,
    aggregatedValue: { value: 3.5, values: [{ key: 99.0, value: 3.5 }] },
  },
];

const bucketsC = [
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5 },
  },
  {
    doc_count: 3,
    aggregatedValue: { value: 16.0 },
  },
];

export const basicMetricResponse = {
  aggregations: {
    aggregatedIntervals: {
      buckets: bucketsA,
    },
  },
};

export const alternateMetricResponse = {
  aggregations: {
    aggregatedIntervals: {
      buckets: bucketsB,
    },
  },
};

export const emptyMetricResponse = {
  aggregations: {
    aggregatedIntervals: {
      buckets: [],
    },
  },
};

export const basicCompositeResponse = {
  aggregations: {
    groupings: {
      after_key: { groupBy0: 'foo' },
      buckets: [
        {
          key: {
            groupBy0: 'a',
          },
          aggregatedIntervals: {
            buckets: bucketsA,
          },
        },
        {
          key: {
            groupBy0: 'b',
          },
          aggregatedIntervals: {
            buckets: bucketsB,
          },
        },
      ],
    },
  },
  hits: {
    total: {
      value: 2,
    },
  },
};

export const alternateCompositeResponse = {
  aggregations: {
    groupings: {
      after_key: { groupBy0: 'foo' },
      buckets: [
        {
          key: {
            groupBy0: 'a',
          },
          aggregatedIntervals: {
            buckets: bucketsB,
          },
        },
        {
          key: {
            groupBy0: 'b',
          },
          aggregatedIntervals: {
            buckets: bucketsA,
          },
        },
      ],
    },
  },
  hits: {
    total: {
      value: 2,
    },
  },
};

export const compositeEndResponse = {
  aggregations: {},
  hits: { total: { value: 0 } },
};

export const changedSourceIdResponse = {
  aggregations: {
    aggregatedIntervals: {
      buckets: bucketsC,
    },
  },
};
