/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleDataClient } from '../../../../../../../rule_registry/server';
import { EventHit } from '../../../signals/threat_mapping/types';

interface PercolateSourceEventsOptions {
  chunkedSourceEventHits: EventHit[][];
  percolatorRuleDataClient: IRuleDataClient;
  ruleId: string;
  ruleVersion: number;
}

export const percolateSourceEvents = async ({
  chunkedSourceEventHits,
  percolatorRuleDataClient,
  ruleId,
  ruleVersion,
}: PercolateSourceEventsOptions) =>
  Promise.all(
    chunkedSourceEventHits.map((hits) =>
      percolatorRuleDataClient.getReader().search({
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
      })
    )
  );
