/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from 'kibana/server';
import { Index } from '../index';

export type Enricher = (
  indices: Index[],
  client: IScopedClusterClient,
  logger: Logger
) => Promise<Index[]>;

export class IndexDataEnricher {
  private readonly _enrichers: Enricher[] = [];

  public add(enricher: Enricher) {
    this._enrichers.push(enricher);
  }

  public enrichIndices = async (
    indices: Index[],
    client: IScopedClusterClient,
    logger: Logger
  ): Promise<Index[]> => {
    let enrichedIndices = indices;

    for (let i = 0; i < this.enrichers.length; i++) {
      const dataEnricher = this.enrichers[i];
      try {
        logger.info(`TEST_126169__INDEX_ENRICHER_${i + 1}__STARTED`);
        const dataEnricherResponse = await dataEnricher(enrichedIndices, client, logger);
        logger.info(`TEST_126169__INDEX_ENRICHER_${i + 1}__COMPLETED`);
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
