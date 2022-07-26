/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce } from 'lodash';
import {
  Logger,
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsErrorHelpers,
  SavedObjectsOpenPointInTimeResponse,
} from '@kbn/core/server';
import type { AggregationsSumAggregate } from '@elastic/elasticsearch/lib/api/types';
import { AuditEvent, AuditLogger } from '@kbn/security-plugin/server';
import { nodeBuilder, escapeKuery, KueryNode } from '@kbn/es-query';

import { getFlattenedObject } from '@kbn/std';
import { BlobStorageService } from '../blob_storage_service';
import { InternalFileShareService } from '../file_share_service';
import {
  FileSavedObjectAttributes,
  File as IFile,
  FileSavedObject,
  UpdatableFileAttributes,
  FileKind,
  FileJSON,
  FilesMetrics,
  ES_FIXED_SIZE_INDEX_BLOB_STORE,
  FileStatus,
} from '../../common';
import { File, toJSON } from '../file';
import { FileKindsRegistry } from '../file_kinds_registry';
import { FileNotFoundError } from './errors';

export interface CreateFileArgs<Meta = unknown> {
  name: string;
  fileKind: string;
  alt?: string;
  meta?: Meta;
  mime?: string;
}

export interface UpdateFileArgs {
  id: string;
  fileKind: string;
  attributes: UpdatableFileAttributes;
}

export interface DeleteFileArgs {
  id: string;
  fileKind: string;
}

export interface ListFilesArgs {
  fileKind: string;
  page?: number;
  perPage?: number;
}

export interface GetByIdArgs {
  id: string;
  fileKind: string;
}

export interface FindFileArgs {
  kind?: string[];
  name?: string[];
  extension?: string[];
  status?: string[];
  meta?: Record<string, string>;
  mimeType?: string[];
  page?: number;
  perPage?: number;
}

interface TermsAgg {
  buckets: Array<{ key: string; doc_count: number }>;
}
interface FilesMetricsAggs {
  bytesUsed: AggregationsSumAggregate;
  status: TermsAgg;
  extension: TermsAgg;
}
/**
 * Service containing methods for working with files.
 *
 * All file business logic is encapsulated in the {@link File} class.
 *
 * @internal
 */
export class InternalFileService {
  constructor(
    private readonly savedObjectType: string,
    private readonly soClient: SavedObjectsClientContract | ISavedObjectsRepository,
    private readonly blobStorageService: BlobStorageService,
    private readonly fileShareService: InternalFileShareService,
    private readonly auditLogger: undefined | AuditLogger,
    private readonly fileKindRegistry: FileKindsRegistry,
    private readonly logger: Logger
  ) {}

  public async createFile(args: CreateFileArgs): Promise<IFile> {
    return await File.create({ ...args, fileKind: this.getFileKind(args.fileKind) }, this);
  }

  public createAuditLog(event: AuditEvent) {
    if (this.auditLogger) {
      this.auditLogger.log(event);
    } else {
      // Otherwise just log to info
      this.logger.info(event.message);
    }
  }

  public async updateFile({ attributes, fileKind, id }: UpdateFileArgs): Promise<IFile> {
    const file = await this.getById({ fileKind, id });
    return await file.update(attributes);
  }

  public async deleteFile({ id, fileKind }: DeleteFileArgs): Promise<void> {
    const file = await this.getById({ id, fileKind });
    await file.delete();
  }

  private async get(id: string) {
    try {
      const result = await this.soClient.get<FileSavedObjectAttributes>(this.savedObjectType, id);
      const { Status } = result.attributes;
      if (Status === 'DELETED') {
        throw new FileNotFoundError('File has been deleted');
      }
      return this.toFile(result, this.getFileKind(result.attributes.FileKind));
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw new FileNotFoundError('File not found');
      }
      this.logger.error(`Could not retrieve file: ${e}`);
      throw e;
    }
  }

  public async getById({ fileKind, id }: GetByIdArgs): Promise<IFile> {
    const file = await this.get(id);
    if (file.fileKind !== fileKind) {
      throw new Error(`Unexpected file kind "${file.fileKind}", expected "${fileKind}".`);
    }
    return file;
  }

  public async list({
    fileKind: fileKindId,
    page = 1,
    perPage = 100,
  }: ListFilesArgs): Promise<IFile[]> {
    const fileKind = this.getFileKind(fileKindId);
    const result = await this.soClient.find<FileSavedObjectAttributes>({
      type: this.savedObjectType,
      filter: `${this.savedObjectType}.attributes.FileKind: ${fileKindId} AND NOT ${this.savedObjectType}.attributes.Status: DELETED`,
      page,
      perPage,
      sortField: 'created',
      sortOrder: 'desc',
    });
    return result.saved_objects.map((file) => this.toFile(file, fileKind));
  }

  public toFile(fileSO: FileSavedObject, fileKind: FileKind): IFile {
    return new File(
      fileSO,
      fileKind,
      this,
      this.blobStorageService,
      this.fileShareService,
      this.logger.get(`file-${fileSO.id}`)
    );
  }

  public async createSO(
    id: string,
    attributes: FileSavedObjectAttributes
  ): Promise<FileSavedObject<unknown>> {
    return this.soClient.create<FileSavedObjectAttributes>(this.savedObjectType, attributes, {
      id,
    });
  }

  public async deleteSO(id: string): Promise<void> {
    await this.soClient.delete(this.savedObjectType, id);
  }

  public getFileKind(id: string): FileKind {
    return this.fileKindRegistry.get(id);
  }

  public async updateSO(
    id: string,
    attributes: FileSavedObjectAttributes
  ): Promise<FileSavedObject> {
    const updateResponse = await this.soClient.update(this.savedObjectType, id, attributes);
    return updateResponse as FileSavedObject;
  }

  public async findFilesJSON({
    kind,
    name,
    extension,
    mimeType,
    meta,
    status,
    page,
    perPage,
  }: FindFileArgs): Promise<FileJSON[]> {
    const kueryExpressions: KueryNode[] = [];

    const addFilters = (fieldName: string, values: string[] = []): void => {
      if (values.length) {
        const orExpressions = values
          .filter(Boolean)
          .map((value) =>
            nodeBuilder.is(`${this.savedObjectType}.attributes.${fieldName}`, escapeKuery(value))
          );
        kueryExpressions.push(nodeBuilder.or(orExpressions));
      }
    };

    addFilters('name', name);
    addFilters('FileKind', kind);
    addFilters('Status', status);
    addFilters('mime_type', mimeType);
    addFilters('extension', extension);

    Object.entries(meta ? getFlattenedObject(meta) : {}).forEach(([fieldName, value]) => {
      addFilters(`Meta.${fieldName}`, Array.isArray(value) ? value : [value]);
    });

    const result = await this.soClient.find<FileSavedObjectAttributes>({
      type: this.savedObjectType,
      filter: kueryExpressions ? nodeBuilder.and(kueryExpressions) : undefined,
      page,
      perPage,
      sortOrder: 'desc',
      sortField: 'created',
    });
    return result.saved_objects.map((so) => toJSON(so.id, so.attributes));
  }

  public async getUsageMetrics(): Promise<FilesMetrics> {
    let pit: undefined | SavedObjectsOpenPointInTimeResponse;
    try {
      pit = await this.soClient.openPointInTimeForType(this.savedObjectType);
      const { aggregations } = await this.soClient.find<
        FileSavedObjectAttributes,
        FilesMetricsAggs
      >({
        type: this.savedObjectType,
        pit,
        aggs: {
          bytesUsed: {
            sum: {
              field: `${this.savedObjectType}.attributes.size`,
            },
          },
          status: {
            terms: {
              field: `${this.savedObjectType}.attributes.Status`,
            },
          },
          extension: {
            terms: {
              field: `${this.savedObjectType}.attributes.extension`,
            },
          },
        },
      });

      if (aggregations) {
        const capacity =
          this.blobStorageService.getStaticBlobStorageSettings().esFixedSizeIndex.capacity;
        const used = aggregations.bytesUsed!.value!;
        return {
          storage: {
            [ES_FIXED_SIZE_INDEX_BLOB_STORE]: {
              capacity,
              available: capacity - used,
              used,
            },
          },
          countByExtension: reduce(
            aggregations.extension.buckets,
            (acc, { key, doc_count: docCount }) => ({ ...acc, [key]: docCount }),
            {}
          ),
          countByStatus: reduce(
            aggregations.status.buckets,
            (acc, { key, doc_count: docCount }) => ({ ...acc, [key]: docCount }),
            {} as Record<FileStatus, number>
          ),
        };
      }

      throw new Error('Could not retrieve usage metrics');
    } finally {
      if (pit) {
        await this.soClient.closePointInTime(pit.id).catch(this.logger.error.bind(this.logger));
      }
    }
  }

  public async getByToken(token: string) {
    const { fileId } = await this.fileShareService.getByToken(token);
    return this.get(fileId);
  }
}
