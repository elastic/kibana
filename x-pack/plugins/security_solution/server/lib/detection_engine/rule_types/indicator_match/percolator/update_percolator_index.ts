/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import {
  PercolatorQuery,
  UpdatePercolatorIndexOptions,
} from '../../../signals/threat_mapping/types';
import { createThreatQueriesForPercolator } from './create_threat_queries_for_percolator';
import { persistThreatQueries } from './persist_threat_queries';
import { cleanOutdatedPercolatorQueries } from './clean_outdated_percolator_queries';
import { findIndicatorSearchAfter } from './find_indicator_search_after';

export const updatePercolatorIndex = async ({
  abortableEsClient,
  buildRuleMessage,
  esClient,
  exceptionItems,
  listClient,
  logger,
  percolatorRuleDataClient,
  perPage,
  ruleId,
  ruleVersion,
  threatFilters,
  threatIndex,
  threatLanguage,
  threatMapping,
  threatQuery,
  withTimeout,
}: UpdatePercolatorIndexOptions) => {
  const percolatorIndexName = percolatorRuleDataClient.indexNameWithNamespace('default');

  await withTimeout<void>(
    () =>
      cleanOutdatedPercolatorQueries({
        esClient,
        percolatorIndexName,
        ruleId,
        ruleVersion,
      }),
    'cleanOutdatedPercolatorQueries'
  );

  const searchAfter = await withTimeout<SortResults | undefined>(
    () => findIndicatorSearchAfter({ percolatorRuleDataClient, ruleId, ruleVersion }),
    'findIndicatorSearchAfter'
  );

  const threatQueriesToPersist = await withTimeout<PercolatorQuery[]>(
    () =>
      createThreatQueriesForPercolator({
        abortableEsClient,
        buildRuleMessage,
        exceptionItems,
        listClient,
        logger,
        perPage,
        ruleId,
        ruleVersion,
        searchAfter,
        threatFilters,
        threatIndex,
        threatLanguage,
        threatMapping,
        threatQuery,
      }),
    'createThreatQueriesForPercolator'
  );

  await withTimeout<void>(
    () =>
      persistThreatQueries({
        percolatorRuleDataClient,
        ruleId,
        ruleVersion,
        threatQueriesToPersist,
      }),
    'persistThreatQueries'
  );
};
