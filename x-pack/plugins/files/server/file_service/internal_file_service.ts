/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, ISavedObjectsRepository } from '@kbn/core/server';
import { AuditEvent, AuditLogger } from '@kbn/security-plugin/server';

import { BlobStorageService } from '../blob_storage_service';
import {
  FileSavedObjectAttributes,
  File as IFile,
  FileSavedObject,
  UpdatableFileAttributes,
} from '../../common';
import { File } from '../file';

export interface CreateFileArgs<Meta = unknown> {
  name: string;
  fileKind: string;
  alt?: string;
  meta?: Meta;
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
}

export interface FindFileArgs {
  id: string;
  fileKind: string;
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
    private readonly auditLogger: undefined | AuditLogger,
    private readonly logger: Logger
  ) {}

  // TODO: Enforce that file kind exists based on registry
  public async createFile(args: CreateFileArgs): Promise<IFile> {
    return await File.create(args, this);
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
    const file = await this.find({ fileKind, id });
    return await file.update(attributes);
  }

  public async deleteFile({ id, fileKind }: DeleteFileArgs): Promise<void> {
    const file = await this.find({ id, fileKind });
    await file.delete();
  }

  public async find({ fileKind, id }: FindFileArgs): Promise<IFile> {
    try {
      const result = await this.soClient.get<FileSavedObjectAttributes>(this.savedObjectType, id);
      const { file_kind: actualFileKind, status } = result.attributes;
      if (actualFileKind !== fileKind) {
        throw new Error(`Unexpected file kind "${actualFileKind}", expected "${fileKind}".`);
      }
      if (status === 'DELETED') {
        throw new Error('File has been deleted');
      }
      return this.toFile(result);
    } catch (e) {
      this.logger.error(`Could not retrieve file: ${e}`);
      throw e;
    }
  }

  public async list({ fileKind }: ListFilesArgs): Promise<IFile[]> {
    const result = await this.soClient.find<FileSavedObjectAttributes>({
      type: this.savedObjectType,
      filter: `${this.savedObjectType}.attributes.file_kind: ${fileKind} AND NOT ${this.savedObjectType}.attributes.status: DELETED`,
    });

    return result.saved_objects.map(this.toFile.bind(this));
  }

  public toFile(fileSO: FileSavedObject): IFile {
    return new File(fileSO, this, this.blobStorageService, this.logger.get(`file-${fileSO.id}`));
  }

  public async createSO(attributes: FileSavedObjectAttributes): Promise<FileSavedObject<unknown>> {
    return this.soClient.create<FileSavedObjectAttributes>(this.savedObjectType, attributes);
  }

  public async deleteSO(id: string): Promise<void> {
    await this.soClient.delete(this.savedObjectType, id);
  }

  public async updateSO(
    id: string,
    attributes: FileSavedObjectAttributes
  ): Promise<FileSavedObject> {
    const updateResponse = await this.soClient.update(this.savedObjectType, id, attributes);
    return updateResponse as FileSavedObject;
  }
}
