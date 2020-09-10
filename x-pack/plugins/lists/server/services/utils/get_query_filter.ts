/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DslQuery, EsQueryConfig } from 'src/plugins/data/common';

import { Filter, Query, esQuery } from '../../../../../../src/plugins/data/server';

export interface GetQueryFilterOptions {
  filter: string;
}

export interface GetQueryFilterWithListIdOptions {
  filter: string;
  listId: string;
}

export interface GetQueryFilterReturn {
  bool: { must: DslQuery[]; filter: Filter[]; should: never[]; must_not: Filter[] };
}

export const getQueryFilter = ({ filter }: GetQueryFilterOptions): GetQueryFilterReturn => {
  const kqlQuery: Query = {
    language: 'kuery',
    query: filter,
  };
  const config: EsQueryConfig = {
    allowLeadingWildcards: true,
    dateFormatTZ: 'Zulu',
    ignoreFilterIfFieldNotInIndex: false,
    queryStringOptions: { analyze_wildcard: true },
  };

  return esQuery.buildEsQuery(undefined, kqlQuery, [], config);
};

export const getQueryFilterWithListId = ({
  filter,
  listId,
}: GetQueryFilterWithListIdOptions): GetQueryFilterReturn => {
  const filterWithListId =
    filter.trim() !== '' ? `list_id: ${listId} AND (${filter})` : `list_id: ${listId}`;
  return getQueryFilter({ filter: filterWithListId });
};
