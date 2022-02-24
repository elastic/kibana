/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { Ecs } from 'kibana/server';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IEsSearchRequest, IEsSearchResponse } from 'src/plugins/data/common';

export type RuleRegistrySearchRequest = IEsSearchRequest & {
  featureIds: ValidFeatureId[];
  query?: { bool: estypes.QueryDslBoolQuery };
};

type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;
type DotNestedKeys<T> = (
  T extends object
    ? { [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}` }[Exclude<
        keyof T,
        symbol
      >]
    : ''
) extends infer D
  ? Extract<D, string>
  : never;

export type RuleRegistrySearchResponse = IEsSearchResponse<{
  [Property in DotNestedKeys<Ecs>]: any[];
}>;
