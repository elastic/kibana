/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventCountOptions } from './types';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { buildEventsSearchQuery } from '../build_events_query';

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
