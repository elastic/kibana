/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsServiceSetup, SavedObjectsServiceStart } from '@kbn/core/server';
import { BlobStorageService } from './blob_storage_service';
import { fileObjectType } from './saved_objects';

/**
 * @internal
 */
export class InternalFileService {
  constructor(
    private readonly savedObjectsSetup: SavedObjectsServiceSetup,
    // @ts-ignore FIXME:
    private readonly savedObjectsStart: SavedObjectsServiceStart,
    // @ts-ignore FIXME:
    private readonly blobStorageService: BlobStorageService,
    private readonly logger: Logger
  ) {}

  setup(): void {
    this.savedObjectsSetup.registerType(fileObjectType);
    this.logger.debug('Setup complete');
  }
}
