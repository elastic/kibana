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
  abortableEsClient,
  exceptionItems,
  filters,
  index,
  language,
  logDebugMessage,
  perPage,
  query,
  searchAfter,
  sortOrder,
  timestampOverride,
}: GetNextPageOptions): Promise<estypes.SearchResponse<EventDoc>> => {
  const calculatedPerPage = perPage ?? DETECTION_ENGINE_MAX_PER_PAGE;
  if (calculatedPerPage > ELASTICSEARCH_MAX_PER_PAGE) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }

  logDebugMessage(
    `Querying indicator items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
  );

  const { body: response } = await abortableEsClient.search<
    EventDoc,
    Record<string, estypes.AggregationsAggregate>
  >({
    body: {
      query: getQueryFilter(query, language ?? 'kuery', filters, index, exceptionItems),
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
      ],
      search_after: searchAfter,
      sort: {
        [timestampOverride ?? '@timestamp']: sortOrder,
      },
    },
    track_total_hits: false,
    ignore_unavailable: true,
    index,
    size: calculatedPerPage,
  });

  logDebugMessage(`Retrieved indicator items of size: ${response.hits.hits.length}`);

  return response;
};
