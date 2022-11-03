/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getQueryFilter } from '../get_query_filter';
import type {
  GetThreatListOptions,
  ThreatListCountOptions,
  ThreatListDoc,
  ThreatListItem,
  GetSortForThreatList,
} from './types';

/**
 * This should not exceed 10000 (10k)
 */
export const INDICATOR_PER_PAGE = 1000;

const MAX_NUMBER_OF_THREATS = 10 * 1000;

export const getThreatList = async ({
  esClient,
  index,
  language,
  perPage,
  query,
  ruleExecutionLogger,
  searchAfter,
  threatFilters,
  threatListConfig,
  pitId,
  reassignPitId,
  runtimeMappings,
  listClient,
  exceptionFilter,
}: GetThreatListOptions): Promise<estypes.SearchResponse<ThreatListDoc>> => {
  const calculatedPerPage = perPage ?? INDICATOR_PER_PAGE;
  if (calculatedPerPage > 100000) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }
  const queryFilter = getQueryFilter({
    query,
    language: language ?? 'kuery',
    filters: threatFilters,
    index,
    exceptionFilter,
  });

  ruleExecutionLogger.debug(
    `Querying the indicator items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
  );

  const response = await esClient.search<
    ThreatListDoc,
    Record<string, estypes.AggregationsAggregate>
  >({
    body: {
      ...threatListConfig,
      query: queryFilter,
      search_after: searchAfter,
      runtime_mappings: runtimeMappings,
      sort: getSortForThreatList({
        index,
        listItemIndex: listClient.getListItemIndex(),
      }),
    },
    track_total_hits: false,
    size: calculatedPerPage,
    pit: { id: pitId },
  });

  ruleExecutionLogger.debug(`Retrieved indicator items of size: ${response.hits.hits.length}`);

  reassignPitId(response.pit_id);

  return response;
};

export const getSortForThreatList = ({
  index,
  listItemIndex,
}: GetSortForThreatList): estypes.Sort => {
  const defaultSort = ['_shard_doc'];
  if (index.length === 1 && index[0] === listItemIndex) {
    return defaultSort;
  }

  return [...defaultSort, { '@timestamp': 'asc' }];
};

export const getThreatListCount = async ({
  esClient,
  query,
  language,
  threatFilters,
  index,
  exceptionFilter,
}: ThreatListCountOptions): Promise<number> => {
  const queryFilter = getQueryFilter({
    query,
    language: language ?? 'kuery',
    filters: threatFilters,
    index,
    exceptionFilter,
  });
  const response = await esClient.count({
    body: {
      query: queryFilter,
    },
    ignore_unavailable: true,
    index,
  });
  return response.count;
};

export const getAllThreatListHits = async (
  params: Omit<GetThreatListOptions, 'searchAfter'>
): Promise<ThreatListItem[]> => {
  let allThreatListHits: ThreatListItem[] = [];
  let threatList = await getThreatList({ ...params, searchAfter: undefined });

  allThreatListHits = allThreatListHits.concat(threatList.hits.hits);

  // to prevent loading in memory large number of results, that could lead to out of memory Kibana crash,
  // number of indicators is limited to MAX_NUMBER_OF_THREATS
  while (threatList.hits.hits.length !== 0 && allThreatListHits.length < MAX_NUMBER_OF_THREATS) {
    threatList = await getThreatList({
      ...params,
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
    });

    allThreatListHits = allThreatListHits.concat(threatList.hits.hits);
  }
  return allThreatListHits;
};
