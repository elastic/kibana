/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { toElasticsearchQuery } from '@kbn/es-query';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FilesMetrics, FileMetadata } from '../../../../common';
import type { FindFileArgs } from '../../../file_service';
import type {
  DeleteArg,
  FileDescriptor,
  FileMetadataClient,
  GetArg,
  GetUsageMetricsArgs,
  ListArg,
  UpdateArgs,
  Pagination,
} from '../file_metadata_service';
import { filterArgsToKuery } from './filter_args_to_kuery';

interface FileDocument<M = unknown> {
  file: FileMetadata<M>;
}

export class EsIndexFilesMetadataClient<M = unknown> implements FileMetadataClient {
  constructor(
    private readonly index: string,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  async create({ id, metadata }: FileDescriptor<M>): Promise<FileDescriptor<M>> {
    const result = await this.esClient.index({
      index: this.index,
      id,
      document: { files: metadata },
    });
    return {
      id: result._id,
      metadata,
    };
  }

  async get({ id }: GetArg): Promise<FileDescriptor<M>> {
    const { _source: doc } = await this.esClient.get<FileDocument<M>>({
      index: this.index,
      id,
    });

    if (!doc) {
      this.logger.error(`File with id "${id}" not found`);
      throw new Error('File not found');
    }

    return {
      id,
      metadata: doc.file,
    };
  }

  async delete({ id }: DeleteArg): Promise<void> {
    await this.esClient.delete({ index: this.index, id });
  }

  async update({ id, metadata }: UpdateArgs<M>): Promise<FileDescriptor<M>> {
    await this.esClient.update({ index: this.index, id, doc: { file: metadata } });
    return this.get({ id });
  }

  private paginationToES({ page = 1, perPage = 50 }: Pagination) {
    return {
      size: perPage,
      from: page === 1 ? 0 : page * perPage,
    };
  }

  async list({ page, perPage }: ListArg): Promise<Array<FileDescriptor<M>>> {
    const result = await this.esClient.search<FileDocument<M>>({
      index: this.index,
      query: {
        match_all: {},
      },
      ...this.paginationToES({ page, perPage }),
      sort: 'created',
    });

    return result.hits.hits.map((hit) => {
      return {
        id: hit._id,
        metadata: hit._source?.file!,
      };
    });
  }

  async find({ page, perPage, ...filterArgs }: FindFileArgs): Promise<Array<FileDescriptor<M>>> {
    const attrPrefix: keyof FileDocument = 'file';
    const kuery = filterArgsToKuery({ ...filterArgs, attrPrefix });

    if (!kuery) {
      return this.list({ page, perPage });
    }

    const result = await this.esClient.search<FileDocument<M>>({
      index: this.index,
      query: toElasticsearchQuery(kuery),
      ...this.paginationToES({ page, perPage }),
    });

    return result.hits.hits.map((r) => ({ id: r._id, metadata: r._source?.file! }));
  }

  async getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics> {
    throw new Error('Not implemented');
  }
}
