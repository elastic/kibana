/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFirstIndicatorPage, getNextIndicatorPage } from '../get_threat_list';
import { createPercolateQueries } from '../build_threat_mapping_filter';
import { BooleanFilter, CreateThreatQueriesForPercolatorOptions } from '../types';

export const createThreatQueriesForPercolator = async ({
  buildRuleMessage,
  esClient,
  exceptionItems,
  listClient,
  logger,
  perPage,
  threatFilters,
  threatIndex,
  threatLanguage,
  threatMapping,
  threatQuery,
}: CreateThreatQueriesForPercolatorOptions) => {
  let threatQueriesForPercolator: BooleanFilter[] = [];

  let indicatorPage = await getFirstIndicatorPage({
    buildRuleMessage,
    esClient,
    exceptionItems,
    index: threatIndex,
    language: threatLanguage,
    listClient,
    logger,
    perPage,
    query: threatQuery,
    threatFilters,
  });

  while (indicatorPage.hits.hits.length) {
    threatQueriesForPercolator = threatQueriesForPercolator.concat(
      createPercolateQueries({ threatMapping, threatList: indicatorPage.hits.hits })
    );

    indicatorPage = await getNextIndicatorPage({
      buildRuleMessage,
      esClient,
      exceptionItems,
      index: threatIndex,
      language: threatLanguage,
      listClient,
      logger,
      perPage,
      query: threatQuery,
      // @ts-expect-error@elastic/elasticsearch SearchSortResults might contain null
      searchAfter: indicatorPage.hits.hits[indicatorPage.hits.hits.length - 1].sort,
      sortField: undefined,
      sortOrder: undefined,
      threatFilters,
    });
  }

  return threatQueriesForPercolator;
};
