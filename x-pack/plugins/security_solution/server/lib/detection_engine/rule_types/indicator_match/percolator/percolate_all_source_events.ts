/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleDataClient } from '../../../../../../../rule_registry/server';
import { EventHit } from '../../../signals/threat_mapping/types';

interface PercolateAllSourceEventsOptions {
  percolatorRuleDataClient: IRuleDataClient;
  chunkedSourceEventHits: EventHit[][];
}

export const percolateSourceEvents = async ({
  percolatorRuleDataClient,
  chunkedSourceEventHits,
}: PercolateAllSourceEventsOptions) =>
  Promise.all(
    chunkedSourceEventHits.map((hits) =>
      percolatorRuleDataClient.getReader().search({
        body: {
          query: {
            constant_score: {
              filter: {
                percolate: {
                  field: 'query',
                  documents: hits.map((event) => event._source),
                },
              },
            },
          },
        },
      })
    )
  );
