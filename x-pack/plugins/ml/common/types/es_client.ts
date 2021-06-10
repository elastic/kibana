/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

import { buildEsQuery } from '../../../../../src/plugins/data/common/es_query/es_query';
import type { DslQuery } from '../../../../../src/plugins/data/common/es_query/kuery';
import type { JsonObject } from '../../../../../src/plugins/kibana_utils/common';

import { isPopulatedObject } from '../util/object_utils';

export function isMultiBucketAggregate(
  arg: unknown
): arg is estypes.AggregationsMultiBucketAggregate {
  return isPopulatedObject(arg, ['buckets']);
}

export const ES_CLIENT_TOTAL_HITS_RELATION: Record<
  Uppercase<estypes.SearchTotalHitsRelation>,
  estypes.SearchTotalHitsRelation
> = {
  EQ: 'eq',
  GTE: 'gte',
} as const;

export type InfluencersFilterQuery = ReturnType<typeof buildEsQuery> | DslQuery | JsonObject;
