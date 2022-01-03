/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/chunk';
import { IRuleDataClient } from '../../../../../../../rule_registry/server';
import { BoolFilter } from '../types';
import { ELASTICSEARCH_MAX_PER_PAGE } from '../../../../../../common/cti/constants';

interface PersistThreatQueriesOptions {
  percolatorRuleDataClient: IRuleDataClient;
  threatQueriesToPersist: BoolFilter[];
}

export const persistThreatQueries = async ({
  percolatorRuleDataClient,
  threatQueriesToPersist,
}: PersistThreatQueriesOptions) => {
  const chunkedThreatQueries = chunk(threatQueriesToPersist, ELASTICSEARCH_MAX_PER_PAGE);
  const writeRequests = chunkedThreatQueries.map((queries) =>
    percolatorRuleDataClient.getWriter().bulk({
      body: queries.flatMap((filter, i) => {
        const id = filter._name;
        const indicator = filter.indicator;
        delete filter._name;
        delete filter.indicator;
        return [
          {
            create: {
              _index: `${percolatorRuleDataClient.indexName}-default`,
              _id: id,
            },
          },
          { query: filter, ...indicator?._source },
        ];
      }),
    })
  );
  await Promise.all(writeRequests);
};
