/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFirstEventsPage,
  getNextEventsPage,
} from '../../../signals/threat_mapping/get_threat_list';
import { FetchEventsOptions } from '../../../signals/threat_mapping/types';

export const fetchItems = async <T>({
  buildRuleMessage,
  esClient,
  exceptionItems,
  listClient,
  logger,
  perPage,
  filters,
  index,
  language,
  query,
  transformHits,
}: FetchEventsOptions<T>) => {
  let items: T[] = [];

  let eventPage = await getFirstEventsPage({
    buildRuleMessage,
    esClient,
    exceptionItems,
    index,
    language,
    listClient,
    logger,
    perPage,
    query,
    filters,
  });

  while (eventPage.hits.hits.length) {
    items = items.concat(transformHits(eventPage.hits.hits));

    eventPage = await getNextEventsPage({
      buildRuleMessage,
      esClient,
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
