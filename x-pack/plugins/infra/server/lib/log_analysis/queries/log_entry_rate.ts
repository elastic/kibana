/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import {
  createJobIdFilters,
  createResultTypeFilters,
  createTimeRangeFilters,
  defaultRequestParameters,
} from './common';

export const createLogEntryRateQuery = (
  logRateJobId: string,
  startTime: number,
  endTime: number,
  bucketDuration: number,
  size: number,
  afterKey?: CompositeTimestampPartitionKey
) => ({
  ...defaultRequestParameters,
  body: {
    query: {
      bool: {
        filter: [
          ...createJobIdFilters(logRateJobId),
          ...createTimeRangeFilters(startTime, endTime),
          ...createResultTypeFilters(['model_plot', 'record']),
          {
            term: {
              detector_index: {
                value: 0,
              },
            },
          },
        ],
      },
    },
    aggs: {
      timestamp_partition_buckets: {
        composite: {
          after: afterKey,
          size,
          sources: [
            {
              timestamp: {
                date_histogram: {
                  field: 'timestamp',
                  fixed_interval: `${bucketDuration}ms`,
                  order: 'asc',
                },
              },
            },
            {
              partition: {
                terms: {
                  field: 'partition_field_value',
                  order: 'asc',
                },
              },
            },
          ],
        },
        aggs: {
          filter_model_plot: {
            filter: {
              term: {
                result_type: 'model_plot',
              },
            },
            aggs: {
              average_actual: {
                avg: {
                  field: 'actual',
                },
              },
              sum_actual: {
                sum: {
                  field: 'actual',
                },
              },
            },
          },
          filter_records: {
            filter: {
              term: {
                result_type: 'record',
              },
            },
            aggs: {
              maximum_record_score: {
                max: {
                  field: 'record_score',
                },
              },
              top_hits_record: {
                top_hits: {
                  _source: Object.keys(logRateMlRecordRT.props),
                  size: 100,
                  sort: [
                    {
                      timestamp: 'asc',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  size: 0,
});

const logRateMlRecordRT = rt.type({
  actual: rt.array(rt.number),
  bucket_span: rt.number,
  record_score: rt.number,
  timestamp: rt.number,
  typical: rt.array(rt.number),
});

const metricAggregationRT = rt.type({
  value: rt.union([rt.number, rt.null]),
});

const compositeTimestampPartitionKeyRT = rt.type({
  partition: rt.string,
  timestamp: rt.number,
});

export type CompositeTimestampPartitionKey = rt.TypeOf<typeof compositeTimestampPartitionKeyRT>;

export const logRateModelPlotBucketRT = rt.type({
  key: compositeTimestampPartitionKeyRT,
  filter_records: rt.type({
    doc_count: rt.number,
    maximum_record_score: metricAggregationRT,
    top_hits_record: rt.type({
      hits: rt.type({
        hits: rt.array(
          rt.type({
            _id: rt.string,
            _source: logRateMlRecordRT,
          })
        ),
      }),
    }),
  }),
  filter_model_plot: rt.type({
    doc_count: rt.number,
    average_actual: metricAggregationRT,
    sum_actual: metricAggregationRT,
  }),
});

export type LogRateModelPlotBucket = rt.TypeOf<typeof logRateModelPlotBucketRT>;

export const logRateModelPlotResponseRT = rt.type({
  aggregations: rt.type({
    timestamp_partition_buckets: rt.intersection([
      rt.type({
        buckets: rt.array(logRateModelPlotBucketRT),
      }),
      rt.partial({
        after_key: compositeTimestampPartitionKeyRT,
      }),
    ]),
  }),
});
