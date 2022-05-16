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
    // @ts-ignore FIXME:
    private readonly savedObjectsStart: SavedObjectsServiceStart,
    // @ts-ignore FIXME:
    private readonly blobStorageService: BlobStorageService,
    // @ts-ignore FIXME:
    private readonly logger: Logger
  ) {}

  static setup(savedObjectsSetup: SavedObjectsServiceSetup): void {
    savedObjectsSetup.registerType(fileObjectType);
  }
}
