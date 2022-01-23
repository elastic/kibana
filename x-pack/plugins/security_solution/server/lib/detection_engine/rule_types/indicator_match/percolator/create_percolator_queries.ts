/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPercolateQueries } from './create_percolate_queries';
import {
  PercolatorQuery,
  CreatePercolatorQueriesOptions,
} from '../../../signals/threat_mapping/types';
import { getNextPage } from '../../../signals/threat_mapping/get_next_page';

export const createPercolatorQueries = async ({
  abortableEsClient,
  exceptionItems,
  logDebugMessage,
  perPage,
  ruleId,
  ruleVersion,
  searchAfter,
  threatFilters: filters,
  threatIndex: index,
  threatLanguage: language,
  threatMapping,
  threatQuery: query,
  timestampOverride,
}: CreatePercolatorQueriesOptions) => {
  let items: PercolatorQuery[] = [];
  let updatedSearchAfter;

  let eventPage = await getNextPage({
    abortableEsClient,
    exceptionItems,
    filters,
    index,
    language,
    logDebugMessage,
    perPage,
    query,
    searchAfter,
    sortOrder: 'asc',
    timestampOverride,
  });

  while (eventPage.hits.hits.length) {
    items = items.concat(
      createPercolateQueries({
        ruleId,
        ruleVersion,
        threatList: eventPage.hits.hits,
        threatMapping,
      })
    );

    updatedSearchAfter = eventPage.hits.hits[eventPage.hits.hits.length - 1].sort;

    eventPage = await getNextPage({
      abortableEsClient,
      exceptionItems,
      filters,
      index,
      language,
      logDebugMessage,
      perPage,
      query,
      searchAfter: updatedSearchAfter,
      sortOrder: 'asc',
      timestampOverride,
    });
  }

  return { items, updatedSearchAfter };
};
