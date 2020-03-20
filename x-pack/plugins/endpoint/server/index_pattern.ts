/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract, Logger } from 'kibana/server';
import { IndexPatternService } from '../../ingest_manager/server';

const endpointPackageName = 'endpoint';

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
      endpointPackageName,
      this.datasetPath,
      this.version
    );

    if (!pattern) {
      const version = this.version || 'none';
      this.log.warn(
        `Failed to retrieve index pattern from ingest manager dataset: ${this.datasetPath} version: ${version}`
      );
      throw new Error('Unable to retrieve the index pattern from the ingest manager');
    }

    return pattern;
  }
}
