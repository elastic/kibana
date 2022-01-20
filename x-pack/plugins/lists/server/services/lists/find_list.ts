/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type {
  Filter,
  FoundListSchema,
  Page,
  PerPage,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import { createEsClientCallWithHeaders } from '@kbn/securitysolution-utils';
import type { CountRequest, SearchRequest } from '@elastic/elasticsearch/api/types';

import { SearchEsListSchema } from '../../schemas/elastic_response';
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
  esClient: ElasticsearchClient;
  listIndex: string;
}

export const findList = async ({
  esClient,
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
    currentIndexPosition,
    esClient,
    filter,
    hopSize: 100,
    index: listIndex,
    page,
    perPage,
    searchAfter,
    sortField,
    sortOrder,
  });
  const [request, options] = createEsClientCallWithHeaders<CountRequest>({
    addOriginHeader: true,
    request: {
      body: { query },
      ignore_unavailable: true,
      index: listIndex,
    },
  });
  const { body: totalCount } = await esClient.count(request, options);

  if (scroll.validSearchAfterFound) {
    const [searchRequest, searchOptions] = createEsClientCallWithHeaders<SearchRequest>({
      addOriginHeader: true,
      request: {
        body: {
          query,
          search_after: scroll.searchAfter,
          sort: getSortWithTieBreaker({ sortField, sortOrder }),
        },
        ignore_unavailable: true,
        index: listIndex,
        seq_no_primary_term: true,
        size: perPage,
      },
    });

    // Note: This typing of response = await esClient<SearchResponse<SearchEsListSchema>>
    // is because when you pass in seq_no_primary_term: true it does a "fall through" type and you have
    // to explicitly define the type <T>.
    const { body: response } = await esClient.search<SearchEsListSchema>(
      searchRequest,
      searchOptions
    );
    return {
      cursor: encodeCursor({
        page,
        perPage,
        searchAfter: getSearchAfterWithTieBreaker({ response, sortField }),
      }),
      data: transformElasticToList({ response }),
      page,
      per_page: perPage,
      total: totalCount.count,
    };
  } else {
    return {
      cursor: encodeCursor({ page, perPage, searchAfter: undefined }),
      data: [],
      page,
      per_page: perPage,
      total: totalCount.count,
    };
  }
};
