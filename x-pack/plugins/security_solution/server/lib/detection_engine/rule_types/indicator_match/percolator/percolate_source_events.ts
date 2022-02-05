/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IRuleDataClient } from '../../../../../../../rule_registry/server';
import { SignalSource } from '../../../signals/types';

interface PercolateSourceEventsOptions {
  hits: Array<estypes.SearchHit<SignalSource>>;
  percolatorRuleDataClient: IRuleDataClient;
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
}

export const percolateSourceEvents = async ({
  hits,
  percolatorRuleDataClient,
  ruleId,
  ruleVersion,
  spaceId,
}: PercolateSourceEventsOptions) => {
  let success = true;
  const errors: string[] = [];
  // TODO: response type of ruleDataClient.getReader.search is awkward
  //  it doesn't work with estypes.SearchResponse<unknown, unknown>
  let percolatorResponse: unknown;

  try {
    percolatorResponse = await percolatorRuleDataClient.getReader({ namespace: spaceId }).search({
      body: {
        query: {
          constant_score: {
            filter: {
              percolate: {
                field: 'query',
                documents: hits.map((event) => ({
                  ...event._source,
                  rule_id: ruleId,
                  rule_version: ruleVersion,
                })),
              },
            },
          },
        },
      },
    });
  } catch (e) {
    success = false;
    errors.push(`${e}`);
  }

  return {
    success,
    errors,
    percolatorResponse: percolatorResponse as estypes.SearchResponse<unknown, unknown>,
  };
};
