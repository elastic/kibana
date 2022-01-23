/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleDataClient } from '../../../../../../../rule_registry/server';

export interface FindIndicatorSearchAfterOptions {
  percolatorRuleDataClient: IRuleDataClient;
  ruleId: string;
  ruleVersion: number;
  timestampOverride?: string;
  spaceId: string;
}

export const findIndicatorSearchAfter = async ({
  percolatorRuleDataClient,
  ruleId,
  ruleVersion,
  timestampOverride,
  spaceId,
}: FindIndicatorSearchAfterOptions) => {
  const searchAfterResponse = await percolatorRuleDataClient
    .getReader({ namespace: spaceId })
    .search({
      body: {
        query: {
          percolate: {
            field: 'query',
            document: {
              rule_id: ruleId,
              rule_version: ruleVersion,
              is_search_after_query: true,
            },
          },
        },
        size: 1,
        sort: [
          {
            [timestampOverride ?? '@timestamp']: {
              order: 'desc',
            },
          },
        ],
      },
    });

  // @ts-ignore - indicator_search_after_value is added to the custom fieldmap of percolatorRuleDataClient
  return searchAfterResponse.hits.hits[0]?._source?.indicator_search_after_value;
};
