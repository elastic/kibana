/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ElasticsearchBlobStorage } from './adapters';

export class BlobStorageService {
  private adapters: { es: ElasticsearchBlobStorage };

  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {
    this.adapters = {
      es: new ElasticsearchBlobStorage(
        this.esClient,
        this.logger.get('elasticsearch-blob-storage')
      ),
    };
  }

  async setup(): Promise<void> {
    for (const adapter of Object.values(this.adapters)) {
      await adapter.setup();
    }
  }
}
