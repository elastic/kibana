/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '../util/object_utils';

export function isMultiBucketAggregate(
  arg: unknown
): arg is estypes.AggregationsMultiBucketAggregateBase {
  return isPopulatedObject(arg, ['buckets']);
}

export const ES_CLIENT_TOTAL_HITS_RELATION: Record<
  Uppercase<estypes.SearchTotalHitsRelation>,
  estypes.SearchTotalHitsRelation
> = {
  EQ: 'eq',
  GTE: 'gte',
} as const;

export type InfluencersFilterQuery = estypes.QueryDslQueryContainer;
