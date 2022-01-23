/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/chunk';
import { IRuleDataClient } from '../../../../../../../rule_registry/server';
import { PercolatorQuery } from '../../../signals/threat_mapping/types';
import { ELASTICSEARCH_MAX_PER_PAGE } from '../../../../../../common/constants';

export interface PersistThreatQueriesOptions {
  percolatorRuleDataClient: IRuleDataClient;
  threatQueriesToPersist: PercolatorQuery[];
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
}

export const persistThreatQueries = async ({
  percolatorRuleDataClient,
  threatQueriesToPersist,
  ruleId,
  ruleVersion,
  spaceId,
}: PersistThreatQueriesOptions) => {
  const indexName = percolatorRuleDataClient.indexNameWithNamespace(spaceId);
  const chunkedThreatQueries = chunk(threatQueriesToPersist, ELASTICSEARCH_MAX_PER_PAGE);
  const writeRequests = chunkedThreatQueries.map((queries) =>
    percolatorRuleDataClient.getWriter({ namespace: spaceId }).bulk({
      body: queries.flatMap((query) => {
        const id = query._name;
        const indicator = query.indicator;
        delete query._name;
        delete query.indicator;
        return [
          {
            create: {
              _index: indexName,
              _id: id,
            },
          },
          { query, ...indicator?._source, rule_id: ruleId, rule_version: ruleVersion },
        ];
      }),
    })
  );
  await Promise.all(writeRequests);
};
