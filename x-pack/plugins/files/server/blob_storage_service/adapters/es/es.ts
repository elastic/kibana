/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { ReadStream } from 'fs';

import type { BlobStorage } from '../../types';

import { mappings } from './mappings';

const BLOB_STORAGE_SYSTEM_INDEX_NAME = '.kibana_blob_storage';

export class ElasticsearchBlobStorage implements BlobStorage {
  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  private readonly indexName = BLOB_STORAGE_SYSTEM_INDEX_NAME;

  // @ts-ignore FIXME: Added this functionality prematurely, not being used anywhere yet
  private async createIndex() {
    if (await this.esClient.indices.exists({ index: this.indexName })) {
      this.logger.debug(`${this.indexName} already exists.`);
      return;
    }

    this.logger.info(`Creating ${this.indexName} for Elasticsearch blob store.`);

    try {
      await this.esClient.indices.create({
        index: this.indexName,
        body: {
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
          },
          mappings,
        },
      });
    } catch (e) {
      if (e instanceof errors.ResponseError && e.statusCode === 400) {
        this.logger.warn('Unable to create blob storage index, it may have been created already.');
      }
      throw e;
    }
  }

  async upload(fileName: string, content: ReadStream): Promise<{ uri: string }> {
    throw new Error('Not implemented');
  }

  async download(uri: string): Promise<ReadStream> {
    throw new Error('Not implemented');
  }

  async delete(uri: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
