/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  Logger,
  KibanaRequest,
} from '@kbn/core/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';

import type { File, FileSavedObjectAttributes } from '../../common';
import { fileObjectType, fileShareObjectType } from '../saved_objects';
import { BlobStorageService } from '../blob_storage_service';
import { InternalFileShareService } from '../file_share_service';
import {
  CreateFileArgs,
  FindFileArgs,
  InternalFileService,
  ListFilesArgs,
  UpdateFileArgs,
} from './internal_file_service';
import { FileServiceStart } from './file_service';
import { FileKindsRegistry } from '../file_kinds_registry';

export class FileServiceFactory {
  constructor(
    private readonly savedObjectsService: SavedObjectsServiceStart,
    private readonly blobStorageService: BlobStorageService,
    private readonly security: undefined | SecurityPluginSetup,
    private readonly fileKindRegistry: FileKindsRegistry,
    private readonly logger: Logger
  ) {}

  private createFileService(req?: KibanaRequest): FileServiceStart {
    const hiddenTypes = [fileObjectType.name, fileShareObjectType.name];
    const soClient = req
      ? this.savedObjectsService.getScopedClient(req, {
          includedHiddenTypes: hiddenTypes,
        })
      : this.savedObjectsService.createInternalRepository(hiddenTypes);

    const auditLogger = req
      ? this.security?.audit.asScoped(req)
      : this.security?.audit.withoutRequest;

    const internalFileShareService = new InternalFileShareService(soClient);

    const internalFileService = new InternalFileService(
      fileObjectType.name,
      soClient,
      this.blobStorageService,
      internalFileShareService,
      auditLogger,
      this.fileKindRegistry,
      this.logger
    );

    return {
      async create<M>(args: CreateFileArgs<M>) {
        return internalFileService.createFile(args) as Promise<File<M>>;
      },
      async update<M>(args: UpdateFileArgs) {
        return internalFileService.updateFile(args) as Promise<File<M>>;
      },
      async delete(args) {
        return internalFileService.deleteFile(args);
      },
      async find<M>(args: FindFileArgs) {
        return internalFileService.find(args) as Promise<File<M>>;
      },
      async list<M>(args: ListFilesArgs) {
        return internalFileService.list(args) as Promise<Array<File<M>>>;
      },
      getShareObject: internalFileShareService.get.bind(internalFileShareService),
      updateShareObject: internalFileShareService.update.bind(internalFileShareService),
    };
  }

  /**
   * Get a file service instance that is scoped to the current user request.
   */
  public asScoped(req: KibanaRequest): FileServiceStart {
    return this.createFileService(req);
  }

  /**
   * Get a file service instance that is scoped to the internal user.
   *
   * @note
   * Do not use this to drive interactions with files that are initiated by a
   * user.
   */
  public asInternal(): FileServiceStart {
    return this.createFileService();
  }

  /**
   * This function can only called during Kibana's setup phase
   */
  public static setup(savedObjectsSetup: SavedObjectsServiceSetup): void {
    savedObjectsSetup.registerType<FileSavedObjectAttributes<{}>>(fileObjectType);
    savedObjectsSetup.registerType(fileShareObjectType);
  }
}
