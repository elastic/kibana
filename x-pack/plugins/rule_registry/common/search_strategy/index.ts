/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValidFeatureId } from '@kbn/rule-data-utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Ecs } from '@kbn/core/server';
import { IEsSearchRequest, IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type RuleRegistrySearchRequest = IEsSearchRequest & {
  featureIds: ValidFeatureId[];
  fields?: QueryDslFieldAndFormat[];
  query?: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  sort?: SortCombinations[];
  pagination?: RuleRegistrySearchRequestPagination;
};

export interface RuleRegistrySearchRequestPagination {
  pageIndex: number;
  pageSize: number;
}

type Prev = [
  never,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  ...Array<0>
];

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : string;

type DotNestedKeys<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
  ? { [K in keyof T]-?: Join<K, DotNestedKeys<T[K], Prev[D]>> }[keyof T]
  : never;

export type EcsFields = DotNestedKeys<Omit<Ecs, 'ecs'>>;

export interface BasicFields {
  _id: string;
  _index: string;
}
export type EcsFieldsResponse = {
  [Property in EcsFields]: string[];
} & BasicFields;
export type RuleRegistrySearchResponse = IEsSearchResponse<EcsFieldsResponse>;
