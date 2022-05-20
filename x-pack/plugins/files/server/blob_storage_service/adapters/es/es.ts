/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { pipeline as _pipeline, Readable } from 'stream';
import { promisify } from 'util';
import type { BlobStorage } from '../../types';
import { getReadableContentStream, getWritableContentStream } from './content_stream';
import { mappings } from './mappings';

const pipeline = promisify(_pipeline);

/**
 * Export this value for convenience to be used in tests. Do not use outside of
 * this adapter.
 * @internal
 */
export const BLOB_STORAGE_SYSTEM_INDEX_NAME = '.kibana_blob_storage';

export class ElasticsearchBlobStorage implements BlobStorage {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly index: string = BLOB_STORAGE_SYSTEM_INDEX_NAME,
    private readonly chunkSize: undefined | string,
    private readonly logger: Logger
  ) {
    assert(
      this.index.startsWith('.kibana'),
      `Elasticsearch blob store index name must start with ".kibana", got ${this.index}.`
    );
  }

  private async createIndexIfNotExists(): Promise<void> {
    const index = this.index;
    if (await this.esClient.indices.exists({ index })) {
      this.logger.debug(`${index} already exists.`);
      return;
    }

    this.logger.info(`Creating ${index} for Elasticsearch blob store.`);

    try {
      await this.esClient.indices.create({
        index,
        body: {
          settings: {
            number_of_shards: 1,
            // TODO: Find out whether this is an appropriate setting
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

  public async upload(src: Readable): Promise<{ id: string; size: number }> {
    await this.createIndexIfNotExists();

    try {
      const dest = getWritableContentStream({
        id: undefined, // We are creating a new file
        client: this.esClient,
        index: this.index,
        logger: this.logger.get('content-stream-upload'),
        parameters: {
          encoding: 'base64',
          maxChunkSize: this.chunkSize,
        },
      });
      await pipeline(src, dest);
      return {
        id: dest.getDocumentId()!,
        size: dest.getBytesWritten(),
      };
    } catch (e) {
      this.logger.error(`Could not write chunks to Elasticsearch: ${e}`);
      throw e;
    }
  }

  public async download({ id, size }: { id: string; size?: number }): Promise<Readable> {
    return getReadableContentStream({
      id,
      client: this.esClient,
      index: this.index,
      logger: this.logger.get('content-stream-download'),
      parameters: {
        encoding: 'base64',
        size,
      },
    });
  }

  public async delete(id: string): Promise<void> {
    try {
      const dest = getWritableContentStream({
        id,
        client: this.esClient,
        index: this.index,
        logger: this.logger.get('content-stream-delete'),
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
