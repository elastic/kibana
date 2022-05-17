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

export class BlobStorageService {
  private readonly adapters: { es: BlobStorage };

  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {
    this.adapters = {
      es: new ElasticsearchBlobStorage(
        this.esClient,
        this.logger.get('elasticsearch-blob-storage')
      ),
    };
  }
  public async upload(content: Readable): Promise<{ id: string; size: number }> {
    return this.adapters.es.upload(content);
  }

  public async delete(id: string): Promise<void> {
    return this.adapters.es.delete(id);
  }

  public async download(id: string, size?: number): Promise<Readable> {
    return this.adapters.es.download({ id, size });
  }
}
