/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  DeleteArg,
  FileDescriptor,
  FileMetadataClient,
  GetArg,
  GetUsageMetricsArgs,
  ListArg,
  Pagination,
  UpdateArgs,
} from '../file_metadata_service';
import { FileJSON, FilesMetrics } from '@kbn/files-plugin/common';
import { FindFileArgs } from '@kbn/files-plugin/server/file_service';

export class EsIndexFilesMetadataClient<M = unknown> implements FileMetadataClient {
  constructor(
    private readonly index: string,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  async create({ id, metadata }: FileDescriptor<M>): Promise<FileDescriptor<M>> {
    const result = await this.esClient.index({ index: this.index, id, document: metadata });
    return {
      id: result._id,
      metadata,
    };
  }

  async get({ id }: GetArg): Promise<FileDescriptor<M>> {
    const { _source: doc } = await this.esClient.get<FileDescriptor<M>['metadata']>({
      index: this.index,
      id,
    });

    if (!doc) {
      this.logger.error(`File with id "${id}" not found`);
      throw new Error('File not found');
    }

    return {
      id,
      metadata: doc,
    };
  }

  async delete({ id }: DeleteArg): Promise<void> {
    await this.esClient.delete({ index: this.index, id });
  }

  async update({ id, metadata }: UpdateArgs<M>): Promise<FileDescriptor<M>> {
    await this.esClient.update({ index: this.index, id, doc: metadata });
    return this.get({ id });
  }

  async list({ page, perPage }: ListArg): Promise<FileDescriptor<M>[]> {
    const result = await this.esClient.search({
      index: this.index,
      query: {
        match_all: {},
      }
      sort: 'created',
    });
  }

  async getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics> {
    throw new Error('Not implemented');
  }

  async findJSON(arg: FindFileArgs & Pagination): Promise<Array<FileJSON<M>>> {
    throw new Error('Not implemented');
  }
}
