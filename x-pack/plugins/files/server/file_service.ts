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
  SavedObject,
} from '@kbn/core/server';
import { BlobStorageService } from './blob_storage_service';
import { fileObjectType } from './saved_objects';
import { FileSavedObjectAttributes, File as IFile } from '../common';
import { File, createDefaultFileAttributes } from './file';

interface CreateFileArgs<Meta = {}> {
  name: string;
  fileKind: string;
  alt?: string;
  meta?: Meta;
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
  constructor(
    private readonly savedObjectsService: SavedObjectsServiceStart,
    private readonly blobStorageService: BlobStorageService,
    private readonly logger: Logger
  ) {}

  private readonly savedObjectType = fileObjectType.name;

  // TODO: Enforce that file kind exists based on registry
  public async createFile(args: CreateFileArgs): Promise<IFile> {
    const fileSO = await this.savedObjectsService
      .createInternalRepository()
      .create<FileSavedObjectAttributes>(this.savedObjectType, {
        ...createDefaultFileAttributes(),
        ...args,
        file_kind: args.fileKind,
      });

    return this.from(fileSO);
  }

  public async find({ fileKind, id }: FindFileArgs): Promise<undefined | IFile> {
    const result = await this.savedObjectsService
      .createInternalRepository()
      .find<FileSavedObjectAttributes>({
        type: this.savedObjectType,
        search: `_id=${id} AND file_kind=${fileKind}`,
        searchFields: ['_id', 'attributes.file_kind'],
      });

    const so = result.saved_objects[0];
    return so ? this.from(so) : undefined;
  }

  public async list({ fileKind }: ListFilesArgs): Promise<IFile[]> {
    const result = await this.savedObjectsService
      .createInternalRepository()
      .find<FileSavedObjectAttributes>({
        type: this.savedObjectType,
        search: `file_kind=${fileKind}`,
        searchFields: ['attributes.file_kind'],
      });

    return result.saved_objects.map(this.from.bind(this));
  }

  public async deleteFileSO(id: string): Promise<void> {
    await this.savedObjectsService.createInternalRepository().delete(this.savedObjectType, id);
  }

  public async updateFileSO(id: string, attributes: FileSavedObjectAttributes) {
    return await this.savedObjectsService
      .createInternalRepository()
      .update(this.savedObjectType, id, attributes);
  }

  public from<M>(fileSO: SavedObject<FileSavedObjectAttributes<M>>): IFile {
    return new File(this, this.blobStorageService, fileSO, this.logger.get(`file-${fileSO.id}`));
  }

  public static setup(savedObjectsSetup: SavedObjectsServiceSetup): void {
    savedObjectsSetup.registerType(fileObjectType);
  }
}
