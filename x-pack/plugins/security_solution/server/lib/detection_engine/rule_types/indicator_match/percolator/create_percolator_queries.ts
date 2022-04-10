/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createThreatQueries } from './create_threat_queries';
import {
  PercolatorQuery,
  CreatePercolatorQueriesOptions,
  ThreatListConfig,
} from '../../../signals/threat_mapping/types';
import { getNextPage } from '../../../signals/threat_mapping/get_next_page';

export const createPercolatorQueries = async ({
  esClient,
  exceptionItems,
  logDebugMessage,
  perPage,
  ruleId,
  ruleVersion,
  searchAfter,
  threatFilters: filters,
  threatIndex: index,
  threatIndicatorPath,
  threatLanguage: language,
  threatMapping,
  threatQuery: query,
}: CreatePercolatorQueriesOptions) => {
  let items: PercolatorQuery[] = [];
  let updatedSearchAfter;
  const threatListConfig: ThreatListConfig = {
    _source: [`${threatIndicatorPath}.*`, 'threat.feed.name'],
    fields: threatMapping.map((mapping) => mapping.entries.map((item) => item.value)).flat(),
    sort: [{ '@timestamp': 'asc' }],
  };

  let indicatorPage = await getNextPage({
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
  });

  while (indicatorPage.hits.hits.length) {
    items = items.concat(
      createThreatQueries({
        ruleId,
        ruleVersion,
        threatList: indicatorPage.hits.hits,
        threatMapping,
        threatIndicatorPath,
      })
    );

    updatedSearchAfter = indicatorPage.hits.hits[indicatorPage.hits.hits.length - 1].sort;

    indicatorPage = await getNextPage({
      esClient,
      exceptionItems,
      filters,
      index,
      language,
      logDebugMessage,
      perPage,
      query,
      searchAfter: updatedSearchAfter,
      threatListConfig,
    });
  }

  return { items, updatedSearchAfter };
};
