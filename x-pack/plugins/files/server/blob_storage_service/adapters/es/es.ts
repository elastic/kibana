/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable, Readable, pipeline as _pipeline } from 'stream';
import { promisify } from 'util';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import type { BlobStorage } from '../../types';
import { mappings } from './mappings';
import { getWritableContentStream, getReadableContentStream } from './content_stream';

const BLOB_STORAGE_SYSTEM_INDEX_NAME = '.kibana_blob_storage';
const pipeline = promisify(_pipeline);

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

  async upload(src: Readable): Promise<{ id: string }> {
    try {
      const dest = getWritableContentStream({
        id: undefined, // We are creating a new file
        client: this.esClient,
        index: this.indexName,
        logger: this.logger.get('content-stream-uploader'),
        parameters: {
          encoding: 'base64',
        },
      });
      await pipeline(src, dest);
      return {
        id: dest.getDocumentId()!,
      };
    } catch (e) {
      this.logger.error(`Could not write chunks to Elasticsearch: ${e}`);
      throw e;
    }
  }

  async download(id: string): Promise<Readable> {
    return getReadableContentStream({
      id,
      client: this.esClient,
      index: this.indexName,
      logger: this.logger,
      parameters: {
        encoding: 'base64',
      },
    });
  }

  async delete(id: string): Promise<void> {
    try {
      const dest = getWritableContentStream({
        id,
        client: this.esClient,
        index: this.indexName,
        logger: this.logger.get('content-stream-uploader'),
        parameters: {
          encoding: 'base64',
        },
      });
      /** @note Overwriting existing content with an empty buffer to remove all the chunks. */
      await promisify(dest.end.bind(dest, '', 'utf8'))();
    } catch (e) {
      this.logger.error(`Could not delete file: ${e}`);
      throw e;
    }
  }
}
