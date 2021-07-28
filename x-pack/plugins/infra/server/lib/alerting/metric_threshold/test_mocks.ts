/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { range } from 'lodash';
const bucketsA = (from: number) => [
  {
    doc_count: null,
    aggregatedValue: { value: null, values: [{ key: 95.0, value: null }] },
    from_as_string: new Date(from).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5, values: [{ key: 95.0, value: 0.5 }] },
    from_as_string: new Date(from + 60000).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5, values: [{ key: 95.0, value: 0.5 }] },
    from_as_string: new Date(from + 120000).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5, values: [{ key: 95.0, value: 0.5 }] },
    from_as_string: new Date(from + 180000).toISOString(),
  },
  {
    doc_count: 3,
    aggregatedValue: { value: 1.0, values: [{ key: 95.0, value: 1.0 }] },
    from_as_string: new Date(from + 240000).toISOString(),
  },
  {
    doc_count: 1,
    aggregatedValue: { value: 1.0, values: [{ key: 95.0, value: 1.0 }] },
    from_as_string: new Date(from + 300000).toISOString(),
  },
];

const bucketsB = (from: number) => [
  {
    doc_count: 0,
    aggregatedValue: { value: null, values: [{ key: 99.0, value: null }] },
    from_as_string: new Date(from).toISOString(),
  },
  {
    doc_count: 4,
    aggregatedValue: { value: 2.5, values: [{ key: 99.0, value: 2.5 }] },
    from_as_string: new Date(from + 60000).toISOString(),
  },
  {
    doc_count: 4,
    aggregatedValue: { value: 2.5, values: [{ key: 99.0, value: 2.5 }] },
    from_as_string: new Date(from + 120000).toISOString(),
  },
  {
    doc_count: 4,
    aggregatedValue: { value: 2.5, values: [{ key: 99.0, value: 2.5 }] },
    from_as_string: new Date(from + 180000).toISOString(),
  },
  {
    doc_count: 5,
    aggregatedValue: { value: 3.5, values: [{ key: 99.0, value: 3.5 }] },
    from_as_string: new Date(from + 240000).toISOString(),
  },
  {
    doc_count: 1,
    aggregatedValue: { value: 3, values: [{ key: 99.0, value: 3 }] },
    from_as_string: new Date(from + 300000).toISOString(),
  },
];

const bucketsC = (from: number) => [
  {
    doc_count: 0,
    aggregatedValue: { value: null },
    from_as_string: new Date(from).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5 },
    from_as_string: new Date(from + 60000).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5 },
    from_as_string: new Date(from + 120000).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5 },
    from_as_string: new Date(from + 180000).toISOString(),
  },
  {
    doc_count: 3,
    aggregatedValue: { value: 16 },
    from_as_string: new Date(from + 240000).toISOString(),
  },
  {
    doc_count: 1,
    aggregatedValue: { value: 3 },
    from_as_string: new Date(from + 300000).toISOString(),
  },
];

const previewBucketsA = (from: number) =>
  range(from, from + 3600000, 60000).map((timestamp, i) => {
    return {
      doc_count: i % 2 ? 3 : 2,
      aggregatedValue: { value: i % 2 ? 16 : 0.5 },
      from_as_string: new Date(timestamp).toISOString(),
    };
  });

const previewBucketsB = (from: number) =>
  range(from, from + 3600000, 60000).map((timestamp, i) => {
    const value = i % 2 ? 3.5 : 2.5;
    return {
      doc_count: i % 2 ? 3 : 2,
      aggregatedValue: { value, values: [{ key: 99.0, value }] },
      from_as_string: new Date(timestamp).toISOString(),
    };
  });

const previewBucketsWithNulls = (from: number) => [
  // 25 Fired
  ...range(from, from + 1500000, 60000).map((timestamp) => {
    return {
      doc_count: 2,
      aggregatedValue: { value: 1, values: [{ key: 95.0, value: 1 }] },
      from_as_string: new Date(timestamp).toISOString(),
    };
  }),
  // 25 OK
  ...range(from + 2100000, from + 2940000, 60000).map((timestamp) => {
    return {
      doc_count: 2,
      aggregatedValue: { value: 0.5, values: [{ key: 95.0, value: 0.5 }] },
      from_as_string: new Date(timestamp).toISOString(),
    };
  }),
  // 10 No Data
  ...range(from + 3000000, from + 3600000, 60000).map((timestamp) => {
    return {
      doc_count: 0,
      aggregatedValue: { value: null, values: [{ key: 95.0, value: null }] },
      from_as_string: new Date(timestamp).toISOString(),
    };
  }),
];

const previewBucketsRepeat = (from: number) =>
  range(from, from + 3600000, 60000).map((timestamp, i) => {
    return {
      doc_count: i % 3 ? 3 : 2,
      aggregatedValue: { value: i % 3 ? 0.5 : 16 },
      from_as_string: new Date(timestamp).toISOString(),
    };
  });

export const basicMetricResponse = (from: number) => ({
  aggregations: {
    aggregatedIntervals: {
      buckets: bucketsA(from),
    },
  },
});

export const alternateMetricResponse = (from: number) => ({
  aggregations: {
    aggregatedIntervals: {
      buckets: bucketsB(from),
    },
  },
});

export const emptyMetricResponse = {
  aggregations: {
    aggregatedIntervals: {
      buckets: [],
    },
  },
};

export const emptyRateResponse = (from: number) => ({
  aggregations: {
    aggregatedIntervals: {
      buckets: [
        {
          doc_count: 2,
          aggregatedValueMax: { value: null },
          from_as_string: new Date(from).toISOString(),
        },
      ],
    },
  },
});

export const basicCompositeResponse = (from: number) => ({
  aggregations: {
    groupings: {
      after_key: { groupBy0: 'foo' },
      buckets: [
        {
          key: {
            groupBy0: 'a',
          },
          aggregatedIntervals: {
            buckets: bucketsA(from),
          },
        },
        {
          key: {
            groupBy0: 'b',
          },
          aggregatedIntervals: {
            buckets: bucketsB(from),
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
});

export const alternateCompositeResponse = (from: number) => ({
  aggregations: {
    groupings: {
      after_key: { groupBy0: 'foo' },
      buckets: [
        {
          key: {
            groupBy0: 'a',
          },
          aggregatedIntervals: {
            buckets: bucketsB(from),
          },
        },
        {
          key: {
            groupBy0: 'b',
          },
          aggregatedIntervals: {
            buckets: bucketsA(from),
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
});

export const compositeEndResponse = {
  aggregations: {},
  hits: { total: { value: 0 } },
};

export const changedSourceIdResponse = (from: number) => ({
  aggregations: {
    aggregatedIntervals: {
      buckets: bucketsC(from),
    },
  },
});

export const basicMetricPreviewResponse = (from: number) => ({
  aggregations: {
    aggregatedIntervals: {
      buckets: previewBucketsA(from),
    },
  },
});

export const alternateMetricPreviewResponse = (from: number) => ({
  aggregations: {
    aggregatedIntervals: {
      buckets: previewBucketsWithNulls(from),
    },
  },
});

export const repeatingMetricPreviewResponse = (from: number) => ({
  aggregations: {
    aggregatedIntervals: {
      buckets: previewBucketsRepeat(from),
    },
  },
});

export const basicCompositePreviewResponse = (from: number) => ({
  aggregations: {
    groupings: {
      after_key: { groupBy0: 'foo' },
      buckets: [
        {
          key: {
            groupBy0: 'a',
          },
          aggregatedIntervals: {
            buckets: previewBucketsA(from),
          },
        },
        {
          key: {
            groupBy0: 'b',
          },
          aggregatedIntervals: {
            buckets: previewBucketsB(from),
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
});
