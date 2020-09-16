/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import {
  GetSortWithTieBreakerOptions,
  GetThreatListOptions,
  SortWithTieBreaker,
  ThreatListItem,
} from './types';

/**
 * This should not exceed 10000 (10k)
 */
export const MAX_PER_PAGE = 9000;

export const getThreatList = async ({
  callCluster,
  query,
  index,
  perPage,
  searchAfter,
  sortField,
  sortOrder,
  exceptionItems,
  threatFilters,
}: GetThreatListOptions): Promise<SearchResponse<ThreatListItem>> => {
  const calculatedPerPage = perPage ?? MAX_PER_PAGE;
  if (calculatedPerPage > 10000) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }
  const queryFilter = getQueryFilter(query, 'kuery', threatFilters, index, exceptionItems);
  const response: SearchResponse<ThreatListItem> = await callCluster('search', {
    body: {
      query: queryFilter,
      search_after: searchAfter,
      sort: getSortWithTieBreaker({ sortField, sortOrder }),
    },
    ignoreUnavailable: true,
    index,
    size: calculatedPerPage,
  });
  return response;
};

export const getSortWithTieBreaker = ({
  sortField,
  sortOrder,
}: GetSortWithTieBreakerOptions): SortWithTieBreaker[] => {
  const ascOrDesc = sortOrder ?? 'asc';
  if (sortField != null) {
    return [{ [sortField]: ascOrDesc, '@timestamp': 'asc' }];
  } else {
    return [{ '@timestamp': 'asc' }];
  }
};
