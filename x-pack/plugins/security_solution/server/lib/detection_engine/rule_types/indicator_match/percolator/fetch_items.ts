/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNextPage } from '../../../signals/threat_mapping/get_threat_list';
import { FetchEventsOptions } from '../../../signals/threat_mapping/types';

export const fetchItems = async <T>({
  abortableEsClient,
  buildRuleMessage,
  exceptionItems,
  filters,
  index,
  language,
  listClient,
  logger,
  perPage,
  query,
  searchAfter,
  transformHits,
}: FetchEventsOptions<T>) => {
  let items: T[] = [];

  let eventPage = await getNextPage({
    abortableEsClient,
    buildRuleMessage,
    exceptionItems,
    filters,
    index,
    language,
    listClient,
    logger,
    perPage,
    query,
    searchAfter: searchAfter ? [searchAfter[0] as string] : undefined,
    sortField: undefined,
    sortOrder: undefined,
  });

  console.log('____hitLength', eventPage.hits.hits.length);

  while (eventPage.hits.hits.length) {
    items = items.concat(transformHits(eventPage.hits.hits));

    eventPage = await getNextPage({
      abortableEsClient,
      buildRuleMessage,
      exceptionItems,
      index,
      language,
      listClient,
      logger,
      perPage,
      query,
      // @ts-expect-error@elastic/elasticsearch SearchSortResults might contain null
      searchAfter: eventPage.hits.hits[eventPage.hits.hits.length - 1].sort,
      sortField: undefined,
      sortOrder: undefined,
      filters,
    });
  }

  return items;
};
