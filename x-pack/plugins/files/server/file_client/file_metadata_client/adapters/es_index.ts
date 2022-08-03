/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { pipe, flatMap } from 'lodash/fp';
import { getFlattenedObject } from '@kbn/std';
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

  private paginationToES({ page = 1, perPage = 50 }: Pagination) {
    return {
      size: perPage,
      from: page === 1 ? 0 : page * perPage,
    };
  }

  async list({ page, perPage }: ListArg): Promise<Array<FileDescriptor<M>>> {
    const result = await this.esClient.search<FileDescriptor<M>['metadata']>({
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
        metadata: hit._source!,
      };
    });
  }

  async find({
    extension,
    kind,
    meta,
    mimeType,
    name,
    page,
    perPage,
    status,
  }: FindFileArgs): Promise<Array<FileDescriptor<M>>> {
    const toTerms = (field: keyof FileMetadata, value: string[]) =>
      value.map((v) => ({
        term: { [field]: v },
      }));

    const must = [
      ...(extension ? toTerms('extension', extension) : []),
      ...(kind ? toTerms('FileKind', kind) : []),
      ...(mimeType ? toTerms('mime_type', mimeType) : []),
      ...(name ? toTerms('name', name) : []),
      ...(status ? toTerms('Status', status) : []),
      ...(meta
        ? pipe(
            getFlattenedObject,
            Object.entries,
            flatMap(([key, value]) => toTerms(key as keyof FileMetadata, [value]))
          )(meta)
        : []),
    ].filter(Boolean);

    if (!must.length) {
      return this.list({ page, perPage });
    }

    const result = await this.esClient.search<FileMetadata<M>>({
      query: {
        bool: {
          must,
        },
      },
      ...this.paginationToES({ page, perPage }),
    });

    return result.hits.hits.map((r) => ({ id: r._id, metadata: r._source! }));
  }

  async getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics> {
    throw new Error('Not implemented');
  }
}
