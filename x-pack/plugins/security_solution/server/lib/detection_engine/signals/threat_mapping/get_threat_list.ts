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
  ThreatListCountOptions,
  ThreatListItem,
} from './types';

/**
 * This should not exceed 10000 (10k)
 */
export const MAX_PER_PAGE = 9000;

export const getThreatList = async ({
  callCluster,
  query,
  language,
  index,
  perPage,
  searchAfter,
  sortField,
  sortOrder,
  exceptionItems,
  threatFilters,
  listClient,
  buildRuleMessage,
  logger,
}: GetThreatListOptions): Promise<SearchResponse<ThreatListItem>> => {
  const calculatedPerPage = perPage ?? MAX_PER_PAGE;
  if (calculatedPerPage > 10000) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }
  const queryFilter = getQueryFilter(
    query,
    language ?? 'kuery',
    threatFilters,
    index,
    exceptionItems
  );

  logger.debug(
    buildRuleMessage(
      `Querying the indicator items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
    )
  );
  const response: SearchResponse<ThreatListItem> = await callCluster('search', {
    body: {
      query: queryFilter,
      search_after: searchAfter,
      sort: getSortWithTieBreaker({
        sortField,
        sortOrder,
        index,
        listItemIndex: listClient.getListItemIndex(),
      }),
    },
    ignoreUnavailable: true,
    index,
    size: calculatedPerPage,
  });

  logger.debug(buildRuleMessage(`Retrieved indicator items of size: ${response.hits.hits.length}`));
  return response;
};

/**
 * This returns the sort with a tiebreaker if we find out we are only
 * querying against the list items index. If we are querying against any
 * other index we are assuming we are 1 or more ECS compatible indexes and
 * will query against those indexes using just timestamp since we don't have
 * a tiebreaker.
 */
export const getSortWithTieBreaker = ({
  sortField,
  sortOrder,
  index,
  listItemIndex,
}: GetSortWithTieBreakerOptions): SortWithTieBreaker[] => {
  const ascOrDesc = sortOrder ?? 'asc';
  if (index.length === 1 && index[0] === listItemIndex) {
    if (sortField != null) {
      return [{ [sortField]: ascOrDesc, tie_breaker_id: 'asc' }];
    } else {
      return [{ tie_breaker_id: 'asc' }];
    }
  } else {
    if (sortField != null) {
      return [{ [sortField]: ascOrDesc, '@timestamp': 'asc' }];
    } else {
      return [{ '@timestamp': 'asc' }];
    }
  }
};

export const getThreatListCount = async ({
  callCluster,
  query,
  language,
  threatFilters,
  index,
  exceptionItems,
}: ThreatListCountOptions): Promise<number> => {
  const queryFilter = getQueryFilter(
    query,
    language ?? 'kuery',
    threatFilters,
    index,
    exceptionItems
  );
  const response: {
    count: number;
  } = await callCluster('count', {
    body: {
      query: queryFilter,
    },
    ignoreUnavailable: true,
    index,
  });
  return response.count;
};
