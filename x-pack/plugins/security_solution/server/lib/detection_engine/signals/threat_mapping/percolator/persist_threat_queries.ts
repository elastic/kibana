/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import get from 'lodash/get';
import chunk from 'lodash/chunk';
import { IRuleDataClient } from '../../../../../../../rule_registry/server';
import { BooleanFilter } from '../types';
import { ELASTICSEARCH_MAX_PER_PAGE } from '../../../../../../common/cti/constants';

interface PersistThreatQueriesOptions {
  percolatorRuleDataClient: IRuleDataClient;
  threatQueriesForPercolator: BooleanFilter[];
}

export const persistThreatQueries = async ({
  percolatorRuleDataClient,
  threatQueriesForPercolator,
}: PersistThreatQueriesOptions) => {
  const chunkedThreatQueries = chunk(threatQueriesForPercolator, ELASTICSEARCH_MAX_PER_PAGE);
  const writeRequests = chunkedThreatQueries.map((queries) =>
    percolatorRuleDataClient.getWriter().bulk({
      body: queries.flatMap((filter) => [
        {
          create: {
            _index: `${percolatorRuleDataClient.indexName}-default`,
            _id: get(filter, '_name'),
          },
        },
        { query: filter },
      ]),
    })
  );
  await Promise.all(writeRequests);
};
