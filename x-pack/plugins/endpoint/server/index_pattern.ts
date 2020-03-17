/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract, Logger } from 'kibana/server';
import { IndexPatternService } from '../../ingest_manager/server';
import { EndpointAppConstants } from '../common/types';

const fallbackIndexPatterns: Record<string, string> = {
  events: 'events-endpoint-*',
  metadata: 'metadata-endpoint-*',
};

export interface IndexPatternRetriever {
  get(): Promise<string>;
}

export class IngestIndexPatternRetriever implements IndexPatternRetriever {
  constructor(
    private readonly service: IndexPatternService,
    private readonly client: SavedObjectsClientContract,
    private readonly datasetPath: string,
    private readonly log: Logger,
    private readonly version?: string
  ) {}

  async get() {
    const pattern = await this.service.get(
      this.client,
      EndpointAppConstants.ENDPOINT_PACKAGE_NAME,
      this.datasetPath,
      this.version
    );

    if (!pattern) {
      this.log.warn(
        `Failed to retrieve index pattern from ingest manager dataset: ${this.datasetPath} version: ${this.version} finding default`
      );

      const defaultPattern = fallbackIndexPatterns[this.datasetPath];
      if (!defaultPattern) {
        this.log.warn(`Failed to retrieve default index pattern ${this.datasetPath}`);
        throw new Error('Invalid dataset used, unable to find default index pattern');
      }
      return defaultPattern;
    }

    return pattern;
  }
}
