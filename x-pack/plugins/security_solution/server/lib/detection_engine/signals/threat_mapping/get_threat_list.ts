/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import {
  EventCountOptions,
  GetSortWithTieBreakerOptions,
  GetEventsPageOptions,
  SortWithTieBreaker,
  ThreatListDoc,
} from './types';
import {
  DETECTION_ENGINE_MAX_PER_PAGE,
  ELASTICSEARCH_MAX_PER_PAGE,
} from '../../../../../common/cti/constants';
import { buildEventsSearchQuery } from '../build_events_query';

export const getNextPage = async ({
  esClient,
  query,
  language,
  index,
  perPage,
  searchAfter,
  sortField,
  sortOrder,
  exceptionItems,
  filters,
  listClient,
  buildRuleMessage,
  logger,
}: GetEventsPageOptions): Promise<estypes.SearchResponse<ThreatListDoc>> => {
  const calculatedPerPage = perPage ?? DETECTION_ENGINE_MAX_PER_PAGE;
  if (calculatedPerPage > ELASTICSEARCH_MAX_PER_PAGE) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }
  const queryFilter = getQueryFilter(query, language ?? 'kuery', filters, index, exceptionItems);

  logger.debug(
    buildRuleMessage(
      `Querying the indicator items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
    )
  );
  const { body: response } = await esClient.search<
    ThreatListDoc,
    Record<string, estypes.AggregationsAggregate>
  >({
    body: {
      query: queryFilter,
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
      ],
      search_after: searchAfter,
      // @ts-expect-error is not compatible with SortCombinations
      sort: getSortWithTieBreaker({
        sortField,
        sortOrder,
        index,
        listItemIndex: listClient.getListItemIndex(),
      }),
    },
    track_total_hits: false,
    ignore_unavailable: true,
    index,
    size: calculatedPerPage,
  });

  logger.debug(buildRuleMessage(`Retrieved indicator items of size: ${response.hits.hits.length}`));
  return response;
};

/**
 * This returns the sort with a tiebreaker if we find out we are only
 * querying against the list items index. If we are querying against any
 * other index we are assuming we are 1 or more ECS compatible indexes and
 * will query against those indexes using just timestamp since we don't have
 * a tiebreaker.
 */
export const getSortWithTieBreaker = ({
  sortField,
  sortOrder,
  index,
  listItemIndex,
}: GetSortWithTieBreakerOptions): SortWithTieBreaker[] => {
  const ascOrDesc = sortOrder ?? 'asc';
  if (index.length === 1 && index[0] === listItemIndex) {
    if (sortField != null) {
      return [{ [sortField]: ascOrDesc, tie_breaker_id: 'asc' }];
    } else {
      return [{ tie_breaker_id: 'asc' }];
    }
  } else {
    if (sortField != null) {
      return [{ [sortField]: ascOrDesc, '@timestamp': 'desc' }];
    } else {
      return [{ '@timestamp': 'desc' }];
    }
  }
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
  let eventSearchQueryBodyQuery;
  if (tuple) {
    eventSearchQueryBodyQuery = buildEventsSearchQuery({
      index,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      filter,
      size: 0,
      timestampOverride,
      searchAfterSortIds: undefined,
    }).body.query;
  }
  const { body: response } = await esClient.count({
    body: { query: eventSearchQueryBodyQuery ?? filter },
    ignore_unavailable: true,
    index,
  });
  return response.count;
};

export const getFirstPage = (
  params: Omit<GetEventsPageOptions, 'searchAfter' | 'sortField' | 'sortOrder'>
) =>
  getNextPage({
    ...params,
    searchAfter: undefined,
    sortField: undefined,
    sortOrder: undefined,
  });
