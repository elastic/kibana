/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BlobStorage } from './types';
import { ElasticsearchBlobStorage } from './adapters';

interface ElasticsearchBlobStorageSettings {
  index?: string;
  chunkSize?: string;
}

/**
 * This object maps command-specific settings, like the index to use for ES uploading,
 * to the appropriate adapter. The key names must be IDs of the adapter so that it
 * can be correctly mapped.
 */
interface BlobStorageSettings {
  es: ElasticsearchBlobStorageSettings;
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

  public async upload(
    content: Readable,
    args?: BlobStorageSettings
  ): Promise<{ id: string; size: number }> {
    return this.createESBlobStorage({ ...args?.es }).upload(content);
  }

  public async delete(id: string, args?: BlobStorageSettings): Promise<void> {
    return this.createESBlobStorage({ ...args?.es }).delete(id);
  }

  public async download(id: string, size?: number, args?: BlobStorageSettings): Promise<Readable> {
    return this.createESBlobStorage({ ...args?.es }).download({ id, size });
  }
}
