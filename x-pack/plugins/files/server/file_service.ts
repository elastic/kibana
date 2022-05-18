/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  ISavedObjectsRepository,
} from '@kbn/core/server';

import { BlobStorageService } from './blob_storage_service';
import { fileObjectType } from './saved_objects';
import {
  FileSavedObjectAttributes,
  File as IFile,
  FileSavedObject,
  UpdatableFileAttributes,
} from '../common';
import { File, createDefaultFileAttributes } from './file';

interface CreateFileArgs<Meta = {}> {
  name: string;
  fileKind: string;
  alt?: string;
  meta?: Meta;
}

interface UpdateFileArgs {
  id: string;
  fileKind: string;
  attributes: UpdatableFileAttributes;
}

interface DeleteFileArgs {
  id: string;
  fileKind: string;
}

interface ListFilesArgs {
  fileKind: string;
}

interface FindFileArgs {
  id: string;
  fileKind: string;
}

/**
 * @internal
 */
export class InternalFileService {
  private soClient: ISavedObjectsRepository;
  constructor(
    private readonly savedObjectsService: SavedObjectsServiceStart,
    private readonly blobStorageService: BlobStorageService,
    private readonly logger: Logger
  ) {
    this.soClient = this.savedObjectsService.createInternalRepository([this.savedObjectType]);
  }

  private readonly savedObjectType = fileObjectType.name;

  // TODO: Enforce that file kind exists based on registry
  // TODO: Use security audit logger to log file creation
  public async createFile({ fileKind, name, alt, meta }: CreateFileArgs): Promise<IFile> {
    const fileSO = await this.soClient.create<FileSavedObjectAttributes>(this.savedObjectType, {
      ...createDefaultFileAttributes(),
      file_kind: fileKind,
      name,
      alt,
      meta,
    });

    return this.toFile(fileSO);
  }

  public async updateFile({ attributes, fileKind, id }: UpdateFileArgs): Promise<void> {
    const file = await this.find({ fileKind, id });
    await file.update(attributes);
  }

  public async deleteFile({ id, fileKind }: DeleteFileArgs): Promise<void> {
    const file = await this.find({ id, fileKind });
    await file.delete();
  }

  public async find({ fileKind, id }: FindFileArgs): Promise<IFile> {
    try {
      const result = await this.soClient.get<FileSavedObjectAttributes>(this.savedObjectType, id);
      const actualFileKind = result.attributes.file_kind;
      if (actualFileKind !== fileKind) {
        throw new Error(`Unexpected file kind "${actualFileKind}", expected "${fileKind}".`);
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
      filter: `${this.savedObjectType}.attributes.file_kind: ${fileKind}`,
    });

    return result.saved_objects.map(this.toFile.bind(this));
  }

  public toFile(fileSO: FileSavedObject): IFile {
    return new File(this, this.blobStorageService, fileSO, this.logger.get(`file-${fileSO.id}`));
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

  public static setup(savedObjectsSetup: SavedObjectsServiceSetup): void {
    savedObjectsSetup.registerType<FileSavedObjectAttributes<{}>>(fileObjectType);
  }
}
