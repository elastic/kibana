/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';

import {
  Filter,
  FoundListSchema,
  Page,
  PerPage,
  SearchEsListSchema,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../common/schemas';
import { transformElasticToList } from '../utils/transform_elastic_to_list';

import { scrollToStartPage } from './scroll_to_start_page';
import { getQueryFilter } from './get_query_filter';
import { getSortWithTieBreaker } from './get_sort_with_tie_breaker';
import { encodeCursor } from './encode_decode_cursor';
import { getSearchAfterWithTieBreaker } from './get_search_after_with_tie_breaker';

interface FindListOptions {
  filter: Filter;
  currentIndexPosition: number;
  searchAfter: string[] | undefined;
  perPage: PerPage;
  page: Page;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  callCluster: APICaller;
  listIndex: string;
}

export const findList = async ({
  callCluster,
  currentIndexPosition,
  filter,
  page,
  perPage,
  searchAfter,
  sortField,
  listIndex,
  sortOrder,
}: FindListOptions): Promise<FoundListSchema> => {
  const query = getQueryFilter({ filter });

  const scroll = await scrollToStartPage({
    callCluster,
    currentIndexPosition,
    filter,
    hopSize: 100,
    index: listIndex,
    page,
    perPage,
    searchAfter,
    sortField,
    sortOrder,
  });

  const { count } = await callCluster('count', {
    body: {
      query,
    },
    ignoreUnavailable: true,
    index: listIndex,
  });

  if (scroll.validSearchAfterFound) {
    const response = await callCluster<SearchEsListSchema>('search', {
      body: {
        query,
        search_after: scroll.searchAfter,
        sort: getSortWithTieBreaker({ sortField, sortOrder }),
      },
      ignoreUnavailable: true,
      index: listIndex,
      size: perPage,
    });
    return {
      cursor: encodeCursor({
        page,
        perPage,
        searchAfter: getSearchAfterWithTieBreaker({ response, sortField }),
      }),
      data: transformElasticToList({ response }),
      page,
      per_page: perPage,
      total: count,
    };
  } else {
    return {
      cursor: encodeCursor({ page, perPage, searchAfter: undefined }),
      data: [],
      page,
      per_page: perPage,
      total: count,
    };
  }
};
