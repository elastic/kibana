/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleDataClient } from '../../../../../../../rule_registry/server';

interface FindIndicatorSearchAfterOptions {
  percolatorRuleDataClient: IRuleDataClient;
  ruleId: string;
  ruleVersion: number;
}

export const findIndicatorSearchAfter = async ({
  percolatorRuleDataClient,
  ruleId,
  ruleVersion,
}: FindIndicatorSearchAfterOptions) => {
  const searchAfterResponse = await percolatorRuleDataClient
    .getReader({ namespace: 'default' })
    .search({
      body: {
        query: {
          bool: {
            should: [
              {
                match: {
                  rule_id: ruleId,
                },
              },
              {
                match: {
                  rule_version: ruleVersion,
                },
              },
            ],
            minimum_should_match: 2,
          },
        },
        size: 1,
        sort: [
          {
            'event.ingested': {
              order: 'desc',
            },
          },
        ],
      },
    });
  return searchAfterResponse.hits.hits[0]?.sort;
};
