/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCompositeAggregate,
  AggregationsCompositeBucket,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type ThresholdAggregate = AggregationsStringTermsAggregate | AggregationsCompositeAggregate;
export type ThresholdBucket = AggregationsStringTermsBucket | AggregationsCompositeBucket;
