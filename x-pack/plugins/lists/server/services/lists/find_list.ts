/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import {
  Filter,
  FoundListSchema,
  Page,
  PerPage,
  SearchEsListSchema,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../common/schemas';
import {
  encodeCursor,
  getQueryFilter,
  getSearchAfterWithTieBreaker,
  getSortWithTieBreaker,
  scrollToStartPage,
  transformElasticToList,
} from '../utils';

interface FindListOptions {
  filter: Filter;
  currentIndexPosition: number;
  searchAfter: string[] | undefined;
  perPage: PerPage;
  page: Page;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  callCluster: LegacyAPICaller;
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
