/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import {
  Filter,
  FoundListItemSchema,
  ListId,
  Page,
  PerPage,
  SearchEsListItemSchema,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../common/schemas';
import { getList } from '../lists';
import {
  encodeCursor,
  getQueryFilterWithListId,
  getSearchAfterWithTieBreaker,
  getSortWithTieBreaker,
  scrollToStartPage,
  transformElasticToListItem,
} from '../utils';

export interface FindListItemOptions {
  listId: ListId;
  filter: Filter;
  currentIndexPosition: number;
  searchAfter: string[] | undefined;
  perPage: PerPage;
  page: Page;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  callCluster: LegacyAPICaller;
  listIndex: string;
  listItemIndex: string;
}

export const findListItem = async ({
  callCluster,
  currentIndexPosition,
  filter,
  listId,
  page,
  perPage,
  searchAfter,
  sortField: sortFieldWithPossibleValue,
  listIndex,
  listItemIndex,
  sortOrder,
}: FindListItemOptions): Promise<FoundListItemSchema | null> => {
  const list = await getList({ callCluster, id: listId, listIndex });
  if (list == null) {
    return null;
  } else {
    const query = getQueryFilterWithListId({ filter, listId });
    const sortField =
      sortFieldWithPossibleValue === 'value' ? list.type : sortFieldWithPossibleValue;
    const scroll = await scrollToStartPage({
      callCluster,
      currentIndexPosition,
      filter,
      hopSize: 100,
      index: listItemIndex,
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
      index: listItemIndex,
    });

    if (scroll.validSearchAfterFound) {
      const response = await callCluster<SearchEsListItemSchema>('search', {
        body: {
          query,
          search_after: scroll.searchAfter,
          sort: getSortWithTieBreaker({ sortField, sortOrder }),
        },
        ignoreUnavailable: true,
        index: listItemIndex,
        size: perPage,
      });
      return {
        cursor: encodeCursor({
          page,
          perPage,
          searchAfter: getSearchAfterWithTieBreaker({ response, sortField }),
        }),
        data: transformElasticToListItem({ response, type: list.type }),
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
  }
};
