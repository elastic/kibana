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
export const MAX_PER_PAGE = 9000;

export const getThreatList = async ({
  esClient,
  query,
  language,
  index,
  perPage,
  searchAfter,
  exceptionItems,
  threatFilters,
  buildRuleMessage,
  logger,
  threatListConfig,
}: GetThreatListOptions): Promise<estypes.SearchResponse<ThreatListDoc>> => {
  const calculatedPerPage = perPage ?? MAX_PER_PAGE;
  if (calculatedPerPage > 10000) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }
  const queryFilter = getQueryFilter(
    query,
    language ?? 'kuery',
    threatFilters,
    index,
    exceptionItems
  );

  logger.debug(
    buildRuleMessage(
      `Querying the indicator items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
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
      sort: ['_doc', { '@timestamp': 'asc' }],
    },
    track_total_hits: false,
    ignore_unavailable: true,
    index,
    size: calculatedPerPage,
  });

  logger.debug(buildRuleMessage(`Retrieved indicator items of size: ${response.hits.hits.length}`));
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
