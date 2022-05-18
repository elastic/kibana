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

import type { FileSavedObjectAttributes } from '../../common';
import { fileObjectType } from '../saved_objects';
import { BlobStorageService } from '../blob_storage_service';
import { InternalFileService } from './internal_file_service';

export class FileServiceFactory {
  constructor(
    private readonly savedObjectsService: SavedObjectsServiceStart,
    private readonly blobStorageService: BlobStorageService,
    private readonly security: undefined | SecurityPluginSetup,
    private readonly logger: Logger
  ) {}

  private readonly savedObjectType = fileObjectType.name;

  // TODO: This should probably not returnt he InternalFileService directly rather a FileService designed for public
  private createFileService(req?: KibanaRequest): InternalFileService {
    const soClient = req
      ? this.savedObjectsService.getScopedClient(req, {
          includedHiddenTypes: [this.savedObjectType],
        })
      : this.savedObjectsService.createInternalRepository([this.savedObjectType]);

    const auditLogger = req
      ? this.security?.audit.asScoped(req)
      : this.security?.audit.withoutRequest;

    return new InternalFileService(
      this.savedObjectType,
      soClient,
      this.blobStorageService,
      auditLogger,
      this.logger
    );
  }

  /**
   * Get a file service instance that is scoped to the current user request.
   */
  public asScoped(req: KibanaRequest): InternalFileService {
    return this.createFileService(req);
  }

  /**
   * Get a file service instance that is scoped to the internal user.
   *
   * @note
   * Do not use this to drive interactions with files that are initiated by a
   * user.
   */
  public asInternal(): InternalFileService {
    return this.createFileService();
  }

  /**
   * This function can only called during Kibana's setup phase
   */
  public static setup(savedObjectsSetup: SavedObjectsServiceSetup): void {
    savedObjectsSetup.registerType<FileSavedObjectAttributes<{}>>(fileObjectType);
  }
}
