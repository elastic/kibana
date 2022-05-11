/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BlobStorage } from './types';
import { ElasticsearchBlobStorage } from './adapters';

export class BlobStorageService {
  // @ts-ignore FIXME:
  private readonly adapters: { es: BlobStorage };

  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {
    this.adapters = {
      es: new ElasticsearchBlobStorage(
        this.esClient,
        this.logger.get('elasticsearch-blob-storage')
      ),
    };
  }
}
