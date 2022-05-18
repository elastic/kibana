/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregationContainer,
  AggregationsCompositeAggregation,
  AggregationsCompositeBucket,
  AggregationsMultiBucketAggregateBase,
  AggregationsStringTermsBucket,
  AggregationsTermsAggregation,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type ThresholdBucket = AggregationsStringTermsBucket | AggregationsCompositeBucket;
// export type ThresholdBucket = AggregationsMultiBucketAggregateBase;

// export type ThresholdAggregate = AggregationsCompositeAggregate | AggregationsStringTermsAggregate;
export type ThresholdAggregate = AggregationsMultiBucketAggregateBase<ThresholdBucket>;
/*
export type ThresholdAggregate<TBucket extends ThresholdBucket | unknown = unknown> =
  AggregationsMultiBucketAggregateBase<TBucket>;
*/

export interface ThresholdAggregateContainer {
  // <
  // TAggregate extends ThresholdAggregate | unknown = unknown
  // TAggregate extends AggregationsMultiBucketAggregateBase<ThresholdBucket>
  // > {
  thresholdTerms: ThresholdAggregate;
}

export type ThresholdAggregationContainer = Record<
  string,
  | {
      composite: AggregationsCompositeAggregation;
      aggs?: Record<string, AggregationsAggregationContainer>;
    }
  | {
      terms: AggregationsTermsAggregation;
      aggs?: Record<string, AggregationsAggregationContainer>;
    }
>;
