/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/chunk';
import { IRuleDataClient } from '../../../../../../../rule_registry/server';
import { PercolatorQuery } from '../../../signals/threat_mapping/types';
import { ELASTICSEARCH_MAX_PER_PAGE } from '../../../../../../common/cti/constants';

interface PersistThreatQueriesOptions {
  percolatorRuleDataClient: IRuleDataClient;
  threatQueriesToPersist: PercolatorQuery[];
}

export const persistThreatQueries = async ({
  percolatorRuleDataClient,
  threatQueriesToPersist,
}: PersistThreatQueriesOptions) => {
  const chunkedThreatQueries = chunk(threatQueriesToPersist, ELASTICSEARCH_MAX_PER_PAGE);
  const writeRequests = chunkedThreatQueries.map((queries) =>
    percolatorRuleDataClient.getWriter().bulk({
      body: queries.flatMap((query) => {
        const id = query._name;
        const indicator = query.indicator;
        delete query._name;
        delete query.indicator;
        return [
          {
            create: {
              // todo: don't hardcode default
              _index: `${percolatorRuleDataClient.indexName}-default`,
              _id: id,
            },
          },
          { query, ...indicator?._source },
        ];
      }),
    })
  );
  await Promise.all(writeRequests);
};
