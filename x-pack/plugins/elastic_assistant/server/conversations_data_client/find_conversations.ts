/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields, Sort } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { estypes } from '@elastic/elasticsearch';
import { EsQueryConfig, Query, buildEsQuery } from '@kbn/es-query';
import { transformESToConversations } from './transforms';
import { SearchEsConversationSchema } from './types';
import { FindConversationsResponse } from '../schemas/conversations/find_conversations_route.gen';

interface FindConversationsOptions {
  filter?: string;
  fields?: string[];
  perPage: number;
  page: number;
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  esClient: ElasticsearchClient;
  conversationIndex: string;
  runtimeMappings?: MappingRuntimeFields | undefined;
}

export const findConversations = async ({
  esClient,
  filter,
  page,
  perPage,
  sortField,
  conversationIndex,
  fields,
  sortOrder,
}: FindConversationsOptions): Promise<FindConversationsResponse> => {
  const query = getQueryFilter({ filter });
  let sort: Sort | undefined;
  const ascOrDesc = sortOrder ?? ('asc' as const);
  if (sortField != null) {
    sort = [{ [sortField]: ascOrDesc }];
  }
  const response = await esClient.search<SearchEsConversationSchema>({
    body: {
      query,
      track_total_hits: true,
      sort,
    },
    _source: true,
    from: (page - 1) * perPage,
    ignore_unavailable: true,
    index: conversationIndex,
    seq_no_primary_term: true,
    size: perPage,
  });
  return {
    data: transformESToConversations(response),
    page,
    perPage,
    total:
      (typeof response.hits.total === 'number'
        ? response.hits.total // This format is to be removed in 8.0
        : response.hits.total?.value) ?? 0,
  };
};

export interface GetQueryFilterOptions {
  filter?: string;
}

export const getQueryFilter = ({ filter }: GetQueryFilterOptions) => {
  const kqlQuery: Query | Query[] = filter
    ? {
        language: 'kuery',
        query: filter,
      }
    : [];
  const config: EsQueryConfig = {
    allowLeadingWildcards: true,
    dateFormatTZ: 'Zulu',
    ignoreFilterIfFieldNotInIndex: false,
    queryStringOptions: { analyze_wildcard: true },
  };

  return buildEsQuery(undefined, kqlQuery, [], config);
};
