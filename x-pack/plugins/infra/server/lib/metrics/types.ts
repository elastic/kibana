/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { InfraDatabaseSearchResponse, CallWithRequestParams } from '../adapters/framework';

export type ESSearchClient = <Hit = {}, Aggregation = undefined>(
  options: CallWithRequestParams
) => Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;

const NumberOrNullRT = rt.union([rt.number, rt.null]);

export const BasicMetricValueRT = rt.type({ value: NumberOrNullRT });

export const NormalizedMetricValueRT = rt.intersection([
  BasicMetricValueRT,
  rt.type({ normalized_value: NumberOrNullRT }),
]);
export const PercentilesTypeRT = rt.type({ values: rt.record(rt.string, NumberOrNullRT) });

export const PercentilesKeyedTypeRT = rt.type({
  values: rt.array(rt.type({ key: rt.string, value: NumberOrNullRT })),
});

export const TopMetricsTypeRT = rt.type({
  top: rt.array(
    rt.type({
      sort: rt.union([rt.array(rt.number), rt.array(rt.string)]),
      metrics: rt.record(rt.string, rt.union([rt.number, rt.string, rt.null])),
    })
  ),
});

export const MaxPeriodFilterExistsTypeRT = rt.type({
  doc_count: rt.number,
  period: BasicMetricValueRT,
});

export const MetricValueTypeRT = rt.union([
  BasicMetricValueRT,
  NormalizedMetricValueRT,
  PercentilesTypeRT,
  PercentilesKeyedTypeRT,
  TopMetricsTypeRT,
  MaxPeriodFilterExistsTypeRT,
]);
export type MetricValueType = rt.TypeOf<typeof MetricValueTypeRT>;

export const TermsWithMetrics = rt.intersection([
  rt.type({
    buckets: rt.array(rt.record(rt.string, rt.union([rt.number, rt.string, MetricValueTypeRT]))),
  }),
  rt.partial({
    sum_other_doc_count: rt.number,
    doc_count_error_upper_bound: rt.number,
  }),
]);

export const BucketRT = rt.record(
  rt.string,
  rt.union([
    rt.number,
    rt.string,
    MetricValueTypeRT,
    TermsWithMetrics,
    rt.record(rt.string, rt.string),
  ])
);

export const MetricsetRT = rt.type({
  buckets: rt.array(
    rt.type({
      key: rt.string,
      doc_count: rt.number,
    })
  ),
});

export const HistogramRT = rt.type({
  histogram: rt.type({
    buckets: rt.array(BucketRT),
  }),
  metricsets: MetricsetRT,
});

export const MetricsBucketRT = rt.intersection([BucketRT, rt.type({ metricsets: MetricsetRT })]);
export const HistogramBucketRT = rt.intersection([
  rt.type({
    key: rt.record(rt.string, rt.string),
    doc_count: rt.number,
  }),
  HistogramRT,
]);

export const AggregationResponseRT = HistogramRT;

export const CompositeResponseRT = rt.type({
  groupings: rt.intersection([
    rt.type({
      buckets: rt.array(rt.union([HistogramBucketRT, MetricsBucketRT])),
    }),
    rt.partial({
      after_key: rt.record(rt.string, rt.string),
    }),
  ]),
});

export type Bucket = rt.TypeOf<typeof BucketRT>;
export type HistogramBucket = rt.TypeOf<typeof HistogramBucketRT>;
export type CompositeResponse = rt.TypeOf<typeof CompositeResponseRT>;
export type AggregationResponse = rt.TypeOf<typeof AggregationResponseRT>;
export type MetricsESResponse = AggregationResponse | CompositeResponse;

export interface LogQueryFields {
  indexPattern: string;
}
