/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { SortResults } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IRuleDataClient } from '../../../../../../../rule_registry/server';

export interface PersistIndicatorSearchAfterOptions {
  percolatorRuleDataClient: IRuleDataClient;
  searchAfter: SortResults;
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
}

export const persistIndicatorSearchAfter = async ({
  percolatorRuleDataClient,
  searchAfter,
  ruleId,
  ruleVersion,
  spaceId,
}: PersistIndicatorSearchAfterOptions) => {
  const timestamp = moment();
  await percolatorRuleDataClient.getWriter({ namespace: spaceId }).bulk({
    body: [
      {
        create: {
          _index: percolatorRuleDataClient.indexNameWithNamespace(spaceId),
          _id: searchAfter[0],
        },
      },
      {
        indicator_search_after_value: searchAfter,
        '@timestamp': timestamp,
        query: {
          bool: {
            must: [
              {
                match: {
                  rule_id: ruleId,
                },
              },
              { match: { rule_version: ruleVersion } },
              {
                match: {
                  is_search_after_query: true,
                },
              },
            ],
          },
        },
      },
    ],
  });
};
