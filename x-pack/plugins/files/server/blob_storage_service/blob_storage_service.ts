/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BlobStorageSettings } from '../../common';
import { BlobStorage } from './types';
import { ElasticsearchBlobStorage } from './adapters';

interface ElasticsearchBlobStorageSettings {
  index?: string;
  chunkSize?: string;
}

export class BlobStorageService {
  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  private createESBlobStorage({ index, chunkSize }: ElasticsearchBlobStorageSettings): BlobStorage {
    return new ElasticsearchBlobStorage(
      this.esClient,
      index,
      chunkSize,
      this.logger.get('elasticsearch-blob-storage')
    );
  }

  public createBlobStore(args?: BlobStorageSettings) {
    return this.createESBlobStorage({ ...args?.esSingleIndex });
  }
}
