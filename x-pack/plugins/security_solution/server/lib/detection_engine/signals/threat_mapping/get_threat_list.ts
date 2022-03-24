/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import {
  GetThreatListOptions,
  ThreatListCountOptions,
  ThreatListDoc,
  ThreatListItem,
} from './types';

/**
 * This should not exceed 10000 (10k)
 */
export const INDICATOR_PER_PAGE = 1000;

export const getThreatList = async ({
  esClient,
  query,
  language,
  index,
  searchAfter,
  exceptionItems,
  threatFilters,
  buildRuleMessage,
  logger,
  threatListConfig,
  pitId,
  reassignPitId,
}: GetThreatListOptions): Promise<estypes.SearchResponse<ThreatListDoc>> => {
  const queryFilter = getQueryFilter(
    query,
    language ?? 'kuery',
    threatFilters,
    index,
    exceptionItems
  );

  logger.debug(
    buildRuleMessage(
      `Querying the indicator items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${INDICATOR_PER_PAGE} indicator items`
    )
  );

  const response = await esClient.search<
    ThreatListDoc,
    Record<string, estypes.AggregationsAggregate>
  >({
    body: {
      ...threatListConfig,
      query: queryFilter,
      search_after: searchAfter,
      sort: ['_shard_doc', { '@timestamp': 'asc' }],
    },
    track_total_hits: false,
    size: INDICATOR_PER_PAGE,
    pit: { id: pitId },
  });

  logger.debug(buildRuleMessage(`Retrieved indicator items of size: ${response.hits.hits.length}`));

  reassignPitId(response.pit_id);

  return response;
};

export const getThreatListCount = async ({
  esClient,
  query,
  language,
  threatFilters,
  index,
  exceptionItems,
}: ThreatListCountOptions): Promise<number> => {
  const queryFilter = getQueryFilter(
    query,
    language ?? 'kuery',
    threatFilters,
    index,
    exceptionItems
  );
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

  while (threatList.hits.hits.length !== 0) {
    threatList = await getThreatList({
      ...params,
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
    });

    allThreatListHits = allThreatListHits.concat(threatList.hits.hits);
  }
  return allThreatListHits;
};
