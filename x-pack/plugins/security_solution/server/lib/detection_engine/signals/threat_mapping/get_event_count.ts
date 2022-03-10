/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EventCountOptions, EventsOptions, EventDoc } from './types';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { singleSearchAfter } from '../../signals/single_search_after';
import { buildEventsSearchQuery } from '../build_events_query';

export const MAX_PER_PAGE = 9000;

export const getEventList = async ({
  services,
  query,
  language,
  index,
  perPage,
  searchAfter,
  exceptionItems,
  filters,
  buildRuleMessage,
  logger,
  tuple,
  timestampOverride,
}: EventsOptions): Promise<estypes.SearchResponse<EventDoc>> => {
  const calculatedPerPage = perPage ?? MAX_PER_PAGE;
  if (calculatedPerPage > 10000) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }

  logger.debug(
    buildRuleMessage(
      `Querying the events items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
    )
  );

  const filter = getQueryFilter(query, language ?? 'kuery', filters, index, exceptionItems);

  const { searchResult } = await singleSearchAfter({
    buildRuleMessage,
    searchAfterSortIds: searchAfter,
    index,
    from: tuple.from.toISOString(),
    to: tuple.to.toISOString(),
    services,
    logger,
    filter,
    pageSize: Math.ceil(Math.min(tuple.maxSignals, calculatedPerPage)),
    timestampOverride,
    sortOrder: 'desc',
    trackTotalHits: false,
  });

  logger.debug(
    buildRuleMessage(`Retrieved events items of size: ${searchResult.hits.hits.length}`)
  );
  return searchResult;
};

export const getEventCount = async ({
  esClient,
  query,
  language,
  filters,
  index,
  exceptionItems,
  tuple,
  timestampOverride,
}: EventCountOptions): Promise<number> => {
  const filter = getQueryFilter(query, language ?? 'kuery', filters, index, exceptionItems);
  const eventSearchQueryBodyQuery = buildEventsSearchQuery({
    index,
    from: tuple.from.toISOString(),
    to: tuple.to.toISOString(),
    filter,
    size: 0,
    timestampOverride,
    searchAfterSortIds: undefined,
  }).body.query;
  const response = await esClient.count({
    body: { query: eventSearchQueryBodyQuery },
    ignore_unavailable: true,
    index,
  });
  return response.count;
};
