/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BlobStorageSettings, ES_FIXED_SIZE_INDEX_BLOB_STORE } from '../../common';
import { BlobStorageClient } from './types';
import { ElasticsearchBlobStorageClient, MAX_BLOB_STORE_SIZE_BYTES } from './adapters';

interface ElasticsearchBlobStorageSettings {
  index?: string;
  chunkSize?: string;
}

export class BlobStorageService {
  /**
   * The number of uploads per Kibana instance that can be running simultaneously
   */
  private readonly concurrentUploadsToES = 20;

  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {
    ElasticsearchBlobStorageClient.configureConcurrentUpload(this.concurrentUploadsToES);
  }

  private createESBlobStorage({
    index,
    chunkSize,
  }: ElasticsearchBlobStorageSettings): BlobStorageClient {
    return new ElasticsearchBlobStorageClient(
      this.esClient,
      index,
      chunkSize,
      this.logger.get('elasticsearch-blob-storage')
    );
  }

  public createBlobStorageClient(args?: BlobStorageSettings): BlobStorageClient {
    return this.createESBlobStorage({ ...args?.esFixedSizeIndex });
  }

  public getStaticBlobStorageSettings() {
    return {
      [ES_FIXED_SIZE_INDEX_BLOB_STORE]: {
        capacity: MAX_BLOB_STORE_SIZE_BYTES,
      },
    };
  }
}
