/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';

import { BlobStorageService } from './blob_storage_service';
import { InternalFileService } from './file_service';
import { fileObjectType } from './saved_objects';

export class FilesPlugin implements Plugin {
  private readonly logger: Logger;
  private fileService: undefined | InternalFileService;
  private readyPromise: Promise<void> = Promise.resolve();

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    core.savedObjects.registerType(fileObjectType);

    this.readyPromise = core.getStartServices().then(async ([coreStart]) => {
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const blobStorageService = new BlobStorageService(
        esClient,
        this.logger.get('blob-storage-service')
      );
      this.fileService = new InternalFileService(
        core.savedObjects,
        coreStart.savedObjects,
        blobStorageService,
        this.logger.get('files-service')
      );
    });

    return {};
  }

  public start() {
    this.readyPromise!.then(() => {
      this.logger.info(`Files ready: ${Boolean(this.fileService)}`);
    });
    return {};
  }

  public stop() {}
}
