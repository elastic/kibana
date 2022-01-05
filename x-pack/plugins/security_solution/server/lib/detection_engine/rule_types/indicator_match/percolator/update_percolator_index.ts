/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PercolatorQuery,
  UpdatePercolatorIndexOptions,
} from '../../../signals/threat_mapping/types';
import { createThreatQueriesForPercolator } from './create_threat_queries_for_percolator';
import { persistThreatQueries } from './persist_threat_queries';

export const updatePercolatorIndex = async ({
  buildRuleMessage,
  esClient,
  exceptionItems,
  listClient,
  logger,
  percolatorRuleDataClient,
  perPage,
  threatFilters,
  threatIndex,
  threatLanguage,
  threatMapping,
  threatQuery,
  withTimeout,
}: UpdatePercolatorIndexOptions) => {
  const threatQueriesToPersist = await withTimeout<PercolatorQuery[]>(
    () =>
      createThreatQueriesForPercolator({
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
      }),
    'createThreatQueriesForPercolator'
  );
  console.log('____firstThreatQuery', JSON.stringify(threatQueriesToPersist[0]));
  await withTimeout<void>(
    () => persistThreatQueries({ threatQueriesToPersist, percolatorRuleDataClient }),
    'persistThreatQueries'
  );
};
