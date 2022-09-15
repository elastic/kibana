/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type {
  Filter,
  FoundAllListItemsSchema,
  ListId,
  ListItemArraySchema,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';

import { SearchEsListItemSchema } from '../../schemas/elastic_response';
import { getList } from '../lists';
import {
  getQueryFilterWithListId,
  getSortWithTieBreaker,
  transformElasticToListItem,
} from '../utils';

export interface FindAllListItemsOptions {
  listId: ListId;
  filter: Filter;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  esClient: ElasticsearchClient;
  listIndex: string;
  listItemIndex: string;
}

export const findAllListItems = async ({
  esClient,
  filter,
  listId,
  sortField,
  listIndex,
  listItemIndex,
  sortOrder,
}: FindAllListItemsOptions): Promise<FoundAllListItemsSchema | null> => {
  const list = await getList({ esClient, id: listId, listIndex });
  if (list == null) {
    return null;
  } else {
    const allListItems: ListItemArraySchema = [];
    const query = getQueryFilterWithListId({ filter, listId });
    const sort = getSortWithTieBreaker({ sortField, sortOrder });
    const { count } = await esClient.count({
      body: {
        query,
      },
      ignore_unavailable: true,
      index: listItemIndex,
    });

    let response = await esClient.search<SearchEsListItemSchema>({
      body: {
        query,
        sort,
      },
      ignore_unavailable: true,
      index: listItemIndex,
      seq_no_primary_term: true,
      size: 10000,
    });

    if (count > 100000) {
      throw new TypeError('API route only supports up to 100,000 items');
    }

    while (response.hits.hits.length !== 0) {
      allListItems.push(...transformElasticToListItem({ response, type: list.type }));

      if (allListItems.length > 100000) {
        throw new TypeError('API route only supports up to 100,000 items');
      }

      response = await esClient.search<SearchEsListItemSchema>({
        body: {
          query,
          search_after: response.hits.hits[response.hits.hits.length - 1].sort,
          sort,
        },
        ignore_unavailable: true,
        index: listItemIndex,
        seq_no_primary_term: true,
        size: 10000,
      });
    }
    return {
      data: allListItems,
      total: count,
    };
  }
};
