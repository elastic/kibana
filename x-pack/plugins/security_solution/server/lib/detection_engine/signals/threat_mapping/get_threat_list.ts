/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { GetThreatListOptions, ThreatListCountOptions, ThreatListDoc } from './types';

/**
 * This should not exceed 10000 (10k)
 */
export const INDICATOR_PER_PAGE = 1000;

export const getThreatListFunc = (initialPitId: string) => {
  let pitId = initialPitId;

  const getThreatList = async ({
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

    logger.debug(
      buildRuleMessage(`Retrieved indicator items of size: ${response.hits.hits.length}`)
    );

    if (response.pit_id) {
      // there are no concurrent getThreatList requests, so this should be OK
      // eslint-disable-next-line require-atomic-updates
      pitId = response.pit_id;
    }

    return response;
  };

  return getThreatList;
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
