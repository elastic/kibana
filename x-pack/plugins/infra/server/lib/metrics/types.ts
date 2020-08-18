/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export const MetricValueTypeRT = rt.union([
  BasicMetricValueRT,
  NormalizedMetricValueRT,
  PercentilesTypeRT,
  PercentilesKeyedTypeRT,
]);
export type MetricValueType = rt.TypeOf<typeof MetricValueTypeRT>;

export const HistogramBucketRT = rt.record(
  rt.string,
  rt.union([rt.number, rt.string, MetricValueTypeRT])
);

export const HistogramResponseRT = rt.type({
  histogram: rt.type({
    buckets: rt.array(HistogramBucketRT),
  }),
});

const GroupingBucketRT = rt.intersection([
  rt.type({
    key: rt.record(rt.string, rt.string),
    doc_count: rt.number,
  }),
  HistogramResponseRT,
]);

export const GroupingResponseRT = rt.type({
  groupings: rt.intersection([
    rt.type({
      buckets: rt.array(GroupingBucketRT),
    }),
    rt.partial({
      after_key: rt.record(rt.string, rt.string),
    }),
  ]),
});

export type HistogramBucket = rt.TypeOf<typeof HistogramBucketRT>;

export type HistogramResponse = rt.TypeOf<typeof HistogramResponseRT>;

export type GroupingResponse = rt.TypeOf<typeof GroupingResponseRT>;

export type MetricsESResponse = HistogramResponse | GroupingResponse;
