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
  ISavedObjectsRepository,
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
  public async createFile({ fileKind, ...rest }: CreateFileArgs): Promise<IFile> {
    const fileSO = await this.soClient.create<FileSavedObjectAttributes>(this.savedObjectType, {
      ...createDefaultFileAttributes(),
      ...rest,
      file_kind: fileKind,
    });

    return this.from(fileSO);
  }

  public async find({ fileKind, id }: FindFileArgs): Promise<undefined | IFile> {
    try {
      const result = await this.soClient.get<FileSavedObjectAttributes>(this.savedObjectType, id);
      return result.attributes.file_kind === fileKind ? this.from(result) : undefined;
    } catch (e) {
      this.logger.error(`Could not get file: ${e}`);
      return undefined;
    }
  }

  public async list({ fileKind }: ListFilesArgs): Promise<IFile[]> {
    const result = await this.soClient.find<FileSavedObjectAttributes>({
      type: this.savedObjectType,
      filter: `${this.savedObjectType}.attributes.file_kind: ${fileKind}`,
    });

    return result.saved_objects.map(this.from.bind(this));
  }

  public async deleteFileSO(id: string): Promise<void> {
    await this.soClient.delete(this.savedObjectType, id);
  }

  public async updateFileSO(id: string, attributes: FileSavedObjectAttributes) {
    return await this.soClient.update(this.savedObjectType, id, attributes);
  }

  public from<M>(fileSO: SavedObject<FileSavedObjectAttributes<M>>): IFile {
    return new File(this, this.blobStorageService, fileSO, this.logger.get(`file-${fileSO.id}`));
  }

  public static setup(savedObjectsSetup: SavedObjectsServiceSetup): void {
    savedObjectsSetup.registerType(fileObjectType);
  }
}
