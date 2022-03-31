/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { GetNextPageOptions, EventDoc } from './types';
import {
  DETECTION_ENGINE_MAX_PER_PAGE,
  ELASTICSEARCH_MAX_PER_PAGE,
} from '../../../../../common/constants';

export const getNextPage = async ({
  esClient,
  exceptionItems,
  filters,
  index,
  language,
  logDebugMessage,
  perPage,
  query,
  searchAfter,
  threatListConfig,
}: GetNextPageOptions): Promise<estypes.SearchResponse<EventDoc>> => {
  const calculatedPerPage = perPage ?? DETECTION_ENGINE_MAX_PER_PAGE;
  if (calculatedPerPage > ELASTICSEARCH_MAX_PER_PAGE) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }

  logDebugMessage(
    `Querying indicator items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
  );

  const response = await esClient.search<EventDoc, Record<string, estypes.AggregationsAggregate>>({
    body: {
      query: getQueryFilter(query, language ?? 'kuery', filters, index, exceptionItems),
      search_after: searchAfter,
      sort: ['_doc', { '@timestamp': 'asc' }],
      ...threatListConfig,
    },
    track_total_hits: false,
    ignore_unavailable: true,
    index,
    size: calculatedPerPage,
  });

  logDebugMessage(`Retrieved indicator items of size: ${response.hits.hits.length}`);

  return response;
};
