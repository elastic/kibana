/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';

import {
  FilterOrUndefined,
  FoundListSchema,
  PageOrUndefined,
  PerPageOrUndefined,
  SearchEsListSchema,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../common/schemas';
import { transformElasticToList } from '../utils/transform_elastic_to_list';

import { scrollToStartPage } from './scroll_to_start_page';
import { getQueryFilter } from './get_query_filter';
import { getSortWithTieBreaker } from './get_sort_with_tie_breaker';

interface FindListOptions {
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  callCluster: APICaller;
  listIndex: string;
}

export const findList = async ({
  callCluster,
  filter,
  page,
  perPage,
  sortField,
  listIndex,
  sortOrder,
}: FindListOptions): Promise<FoundListSchema> => {
  // TODO: Range checking and throwing errors if the ranges are wrong
  const finalPage = page ?? 1;
  const finalPerPage = perPage ?? 20;
  const scroll = await scrollToStartPage({
    callCluster,
    filter,
    hopSize: 3,
    index: listIndex,
    page: finalPage,
    perPage: finalPerPage,
    sortField,
    sortOrder,
  });
  if (scroll.validSearchAfterFound) {
    const query = filter != null ? getQueryFilter({ query: filter }) : { match_all: {} };
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
    const data = transformElasticToList({ response });
    return {
      data,
      page: finalPage,
      per_page: finalPerPage,
      total: data.length,
    };
  } else {
    return {
      data: [],
      page: 0,
      per_page: 0,
      total: 0,
    };
  }
};
