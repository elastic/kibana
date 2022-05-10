/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregationContainer,
  AggregationsCompositeAggregate,
  AggregationsCompositeAggregation,
  AggregationsCompositeBucket,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  AggregationsTermsAggregation,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type ThresholdAggregate = AggregationsStringTermsAggregate | AggregationsCompositeAggregate;
export type ThresholdBucket = AggregationsStringTermsBucket | AggregationsCompositeBucket;

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
