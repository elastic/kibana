/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregationContainer,
  MappingRuntimeFields,
  Sort,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { estypes } from '@elastic/elasticsearch';
import { EsQueryConfig, Query, buildEsQuery } from '@kbn/es-query';

interface FindOptions {
  filter?: string;
  fields?: string[];
  perPage: number;
  page: number;
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  esClient: ElasticsearchClient;
  index: string;
  runtimeMappings?: MappingRuntimeFields | undefined;
  logger: Logger;
  aggs?: Record<string, AggregationsAggregationContainer>;
  mSearch?: {
    filter: string;
    perPage: number;
  };
}

export interface FindResponse<T> {
  data: estypes.SearchResponse<T, Record<string, estypes.AggregationsAggregate>>;
  page: number;
  perPage: number;
  total: number;
}

export const findDocuments = async <TSearchSchema>({
  esClient,
  filter,
  page,
  perPage,
  sortField,
  index,
  fields,
  sortOrder,
  logger,
  aggs,
  mSearch,
}: FindOptions): Promise<FindResponse<TSearchSchema>> => {
  const query = getQueryFilter({ filter });
  let sort: Sort | undefined;
  const ascOrDesc = sortOrder ?? ('asc' as const);
  if (sortField != null) {
    sort = [{ [sortField]: ascOrDesc }];
  } else {
    sort = {
      updated_at: {
        order: 'desc',
      },
    };
  }
  try {
    if (mSearch == null) {
      const response = await esClient.search<TSearchSchema>({
        body: {
          query,
          track_total_hits: true,
          sort,
        },
        _source: true,
        from: (page - 1) * perPage,
        ignore_unavailable: true,
        index,
        seq_no_primary_term: true,
        size: perPage,
        aggs,
      });

      return {
        data: response,
        page,
        perPage,
        total:
          (typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value) ?? 0,
      };
    }
    const mSearchQueryBody = {
      body: [
        { index },
        {
          query,
          size: perPage,
          aggs,
          seq_no_primary_term: true,
          from: (page - 1) * perPage,
          sort,
          _source: true,
        },
        { index },
        {
          query: getQueryFilter({ filter: mSearch.filter }),
          size: mSearch.perPage,
          aggs,
          seq_no_primary_term: true,
          from: (page - 1) * mSearch.perPage,
          sort,
          _source: true,
        },
      ],
      ignore_unavailable: true,
      index,
    };
    const response = await esClient.msearch<SearchResponse<TSearchSchema>>(mSearchQueryBody);
    let responseStats: Omit<SearchResponse<TSearchSchema>, 'hits'> = {
      took: 0,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
      timed_out: false,
    };
    // flatten the results of the combined find queries into a single array of hits:
    const results = response.responses.flatMap((res) => {
      const mResponse = res as SearchResponse<TSearchSchema>;
      const { hits, ...responseBody } = mResponse;
      // assign whatever the last stats are, they are only used for type
      responseStats = { ...responseStats, ...responseBody };
      return hits?.hits ?? [];
    });

    return {
      data: { ...responseStats, hits: { hits: results } },
      page,
      perPage: perPage + mSearch.perPage,
      total: results.length,
    };
  } catch (err) {
    logger.error(`Error fetching documents: ${err}`);
    throw err;
  }
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
