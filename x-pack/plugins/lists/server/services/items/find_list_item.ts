/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type {
  Filter,
  FoundListItemSchema,
  ListId,
  Page,
  PerPage,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';

import { SearchEsListItemSchema } from '../../schemas/elastic_response';
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
  esClient: ElasticsearchClient;
  listIndex: string;
  listItemIndex: string;
}

export const findListItem = async ({
  esClient,
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
  const list = await getList({ esClient, id: listId, listIndex });
  if (list == null) {
    return null;
  } else {
    const query = getQueryFilterWithListId({ filter, listId });
    const sortField =
      sortFieldWithPossibleValue === 'value' ? list.type : sortFieldWithPossibleValue;
    const scroll = await scrollToStartPage({
      currentIndexPosition,
      esClient,
      filter,
      hopSize: 100,
      index: listItemIndex,
      page,
      perPage,
      searchAfter,
      sortField,
      sortOrder,
    });

    const respose = await esClient.count({
      body: {
        query,
      },
      ignore_unavailable: true,
      index: listItemIndex,
    });

    if (scroll.validSearchAfterFound) {
      // Note: This typing of response = await esClient<SearchResponse<SearchEsListSchema>>
      // is because when you pass in seq_no_primary_term: true it does a "fall through" type and you have
      // to explicitly define the type <T>.
      const response = await esClient.search<SearchEsListItemSchema>({
        body: {
          query,
          search_after: scroll.searchAfter,
          sort: getSortWithTieBreaker({ sortField, sortOrder }),
        },
        ignore_unavailable: true,
        index: listItemIndex,
        seq_no_primary_term: true,
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
        total: respose.count,
      };
    } else {
      return {
        cursor: encodeCursor({ page, perPage, searchAfter: undefined }),
        data: [],
        page,
        per_page: perPage,
        total: respose.count,
      };
    }
  }
};
