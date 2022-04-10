/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import {
  CreatePercolatorQueriesOptions,
  PercolatorQuery,
  UpdatePercolatorIndexOptions,
} from '../../../signals/threat_mapping/types';
import { createPercolatorQueries } from './create_percolator_queries';
import { persistThreatQueries, PersistThreatQueriesOptions } from './persist_threat_queries';
import {
  cleanOutdatedPercolatorQueries,
  CleanOutdatedPercolatorQueriesOptions,
} from './clean_outdated_percolator_queries';
import {
  findIndicatorSearchAfter,
  FindIndicatorSearchAfterOptions,
} from './find_indicator_search_after';
import {
  persistIndicatorSearchAfter,
  PersistIndicatorSearchAfterOptions,
} from './persist_indicator_search_after';

export const updatePercolatorIndex = async ({
  esClient,
  exceptionItems,
  logDebugMessage,
  percolatorRuleDataClient,
  perPage,
  ruleId,
  ruleVersion,
  spaceId,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatMapping,
  threatQuery,
  withTimeout,
}: UpdatePercolatorIndexOptions) => {
  const indicatorSearchAfter = await withTimeout<
    SortResults | undefined,
    FindIndicatorSearchAfterOptions
  >(findIndicatorSearchAfter, {
    percolatorRuleDataClient,
    ruleId,
    ruleVersion,
    spaceId,
  });

  if (indicatorSearchAfter) {
    await withTimeout<void, CleanOutdatedPercolatorQueriesOptions>(cleanOutdatedPercolatorQueries, {
      esClient,
      percolatorIndexName: percolatorRuleDataClient.indexNameWithNamespace(spaceId),
      ruleId,
      ruleVersion,
    });
  }

  const { items: threatQueriesToPersist, updatedSearchAfter } = await withTimeout<
    { items: PercolatorQuery[]; updatedSearchAfter: SortResults | undefined },
    CreatePercolatorQueriesOptions
  >(createPercolatorQueries, {
    esClient,
    exceptionItems,
    logDebugMessage,
    perPage,
    ruleId,
    ruleVersion,
    searchAfter: indicatorSearchAfter,
    threatFilters,
    threatIndex,
    threatIndicatorPath,
    threatLanguage,
    threatMapping,
    threatQuery,
  });

  if (threatQueriesToPersist.length) {
    await withTimeout<void, PersistThreatQueriesOptions>(persistThreatQueries, {
      percolatorRuleDataClient,
      ruleId,
      ruleVersion,
      threatQueriesToPersist,
      spaceId,
    });
  }

  if (threatQueriesToPersist.length && updatedSearchAfter) {
    await withTimeout<void, PersistIndicatorSearchAfterOptions>(persistIndicatorSearchAfter, {
      percolatorRuleDataClient,
      ruleId,
      ruleVersion,
      searchAfter: updatedSearchAfter,
      spaceId,
    });
  }
};
