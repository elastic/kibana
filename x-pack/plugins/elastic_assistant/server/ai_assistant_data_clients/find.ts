/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields, Sort } from '@elastic/elasticsearch/lib/api/types';
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
    });
    return {
      data: response,
      page,
      perPage,
      total:
        (typeof response.hits.total === 'number'
          ? response.hits.total // This format is to be removed in 8.0
          : response.hits.total?.value) ?? 0,
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
