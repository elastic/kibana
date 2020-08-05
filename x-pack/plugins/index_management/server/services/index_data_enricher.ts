/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Index, CallAsCurrentUser } from '../types';

export type Enricher = (indices: Index[], callAsCurrentUser: CallAsCurrentUser) => Promise<Index[]>;

export class IndexDataEnricher {
  private readonly _enrichers: Enricher[] = [];

  public add(enricher: Enricher) {
    this._enrichers.push(enricher);
  }

  public enrichIndices = async (
    indices: Index[],
    callAsCurrentUser: CallAsCurrentUser
  ): Promise<Index[]> => {
    let enrichedIndices = indices;

    for (let i = 0; i < this.enrichers.length; i++) {
      const dataEnricher = this.enrichers[i];
      try {
        const dataEnricherResponse = await dataEnricher(enrichedIndices, callAsCurrentUser);
        enrichedIndices = dataEnricherResponse;
      } catch (e) {
        // silently swallow enricher response errors
      }
    }

    return enrichedIndices;
  };

  public get enrichers() {
    return this._enrichers;
  }
}
