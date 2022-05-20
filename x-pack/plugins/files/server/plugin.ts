/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';

import { BlobStorageService } from './blob_storage_service';
import { FileServiceFactory } from './file_service';
import { FilePluginSetup } from './types';

export class FilesPlugin implements Plugin {
  private readonly logger: Logger;
  private fileServiceFactory: undefined | FileServiceFactory;
  private readyPromise: Promise<void> = Promise.resolve();

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: FilePluginSetup) {
    FileServiceFactory.setup(core.savedObjects);

    this.readyPromise = core.getStartServices().then(async ([coreStart]) => {
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const blobStorageService = new BlobStorageService(
        esClient,
        this.logger.get('blob-storage-service')
      );
      this.fileServiceFactory = new FileServiceFactory(
        coreStart.savedObjects,
        blobStorageService,
        deps.security,
        this.logger.get('files-service')
      );
    });

    return {};
  }

  public start() {
    this.readyPromise.then(() => {
      this.logger.debug(`Is file servicer ready? ${Boolean(this.fileServiceFactory)}`);
    });
    return {};
  }

  public stop() {}
}
