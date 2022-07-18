/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { fromKueryExpression } from '@kbn/es-query';
import { AuditEvent, AuditLogger } from '@kbn/security-plugin/server';

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
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
  meta?: Record<string, string>;
  mimeType?: string[];
  page?: number;
  perPage?: number;
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

  public async getById({ fileKind, id }: GetByIdArgs): Promise<IFile> {
    try {
      const result = await this.soClient.get<FileSavedObjectAttributes>(this.savedObjectType, id);
      const { FileKind: actualFileKind, Status } = result.attributes;
      if (actualFileKind !== fileKind) {
        throw new Error(`Unexpected file kind "${actualFileKind}", expected "${fileKind}".`);
      }
      if (Status === 'DELETED') {
        throw new FileNotFoundError('File has been deleted');
      }
      return this.toFile(result, this.getFileKind(fileKind));
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw new FileNotFoundError('File not found');
      }
      this.logger.error(`Could not retrieve file: ${e}`);
      throw e;
    }
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
    page,
    perPage,
  }: FindFileArgs): Promise<FileJSON[]> {
    const toTermsQuery = (fieldName: string, values?: string[]): QueryDslQueryContainer[] =>
      values
        ? values.map((value) => ({
            term: { [`${this.savedObjectType}.attributes.${fieldName}`]: value },
          }))
        : [];

    const filter = [
      ...toTermsQuery('file_kind', kind),
      ...toTermsQuery('name', name),
      ...toTermsQuery('extension', extension),
      ...toTermsQuery('mimeType', mimeType),
    ];

    const metaFields = meta ? getFlattenedObject(meta) : {};
    Object.entries(metaFields).forEach(([fieldName, value]) => {
      const termsQueries = toTermsQuery(
        `meta.${fieldName}`,
        Array.isArray(value) ? value : [value]
      );
      termsQueries.forEach((query) => filter.push(query));
    });

    const result = await this.soClient.find<FileSavedObjectAttributes>({
      type: this.savedObjectType,
      filter: filter.length
        ? fromKueryExpression({
            bool: {
              must: filter,
              filter: [
                {
                  term: { [`${this.savedObjectType}.attributes.status`]: 'READY' },
                },
              ],
            },
          })
        : undefined,
      defaultSearchOperator: 'AND',
      page,
      perPage,
    });
    return result.saved_objects.map((so) => toJSON(so.id, so.attributes));
  }
}
