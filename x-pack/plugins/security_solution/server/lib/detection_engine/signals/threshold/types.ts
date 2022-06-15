/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCardinalityAggregate,
  AggregationsCompositeBucket,
  AggregationsMaxAggregate,
  AggregationsMinAggregate,
  AggregationsStringTermsBucket,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import { SignalSource } from '../types';
import {
  buildThresholdMultiBucketAggregation,
  buildThresholdSingleBucketAggregation,
} from './build_threshold_aggregation';

export interface ThresholdLeafAggregates {
  max_timestamp: AggregationsMaxAggregate;
  min_timestamp: AggregationsMinAggregate;
  cardinality_count?: AggregationsCardinalityAggregate;
}

export type ThresholdMultiBucketAggregationResult = ESSearchResponse<
  SignalSource,
  {
    body: {
      aggregations: ReturnType<typeof buildThresholdMultiBucketAggregation>;
    };
  }
>;

export type ThresholdSingleBucketAggregationResult = ESSearchResponse<
  SignalSource,
  {
    body: {
      aggregations: ReturnType<typeof buildThresholdSingleBucketAggregation>;
    };
  }
>;

export type ThresholdTermsBucket = AggregationsStringTermsBucket & ThresholdLeafAggregates;
export type ThresholdCompositeBucket = AggregationsCompositeBucket & ThresholdLeafAggregates;
export type ThresholdBucket = ThresholdTermsBucket | ThresholdCompositeBucket;
