/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract, Logger, LoggerFactory } from 'kibana/server';
import { IndexPatternService } from '../../ingest_manager/server';

const endpointPackageName = 'endpoint';

export interface IndexPatternRetriever {
  get(client: SavedObjectsClientContract, datasetPath: string, version?: string): Promise<string>;
}

export class IngestIndexPatternRetriever implements IndexPatternRetriever {
  private readonly log: Logger;
  constructor(private readonly service: IndexPatternService, loggerFactory: LoggerFactory) {
    this.log = loggerFactory.get('index-pattern-retriever');
  }

  async get(client: SavedObjectsClientContract, datasetPath: string, version?: string) {
    const pattern = await this.service.get(client, endpointPackageName, datasetPath, version);

    if (!pattern) {
      const versionStr = version || 'none';
      this.log.warn(
        `Failed to retrieve index pattern from ingest manager dataset: ${datasetPath} version: ${versionStr}`
      );
      throw new Error(
        `Unable to retrieve the index pattern for dataset: ${datasetPath} version: ${version}`
      );
    }

    return pattern;
  }
}
