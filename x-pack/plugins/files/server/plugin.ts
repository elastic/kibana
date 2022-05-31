/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  Logger,
  CoreStart,
} from '@kbn/core/server';

import { BlobStorageService } from './blob_storage_service';
import { FileServiceFactory } from './file_service';
import { FilesPluginSetupDependencies, FilesPluginSetup, FilesPluginStart } from './types';
import { fileKindsRegistry } from './file_kinds_registry';

export class FilesPlugin
  implements Plugin<FilesPluginSetup, FilesPluginStart, FilesPluginSetupDependencies>
{
  private readonly logger: Logger;
  private fileServiceFactory: undefined | FileServiceFactory;
  private securitySetup: FilesPluginSetupDependencies['security'];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: FilesPluginSetupDependencies): FilesPluginSetup {
    FileServiceFactory.setup(core.savedObjects);
    this.securitySetup = deps.security;
    return {
      registerFileKind(fileKind) {
        fileKindsRegistry.register(fileKind);
      },
    };
  }

  public start(coreStart: CoreStart): FilesPluginStart {
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const blobStorageService = new BlobStorageService(
      esClient,
      this.logger.get('blob-storage-service')
    );
    this.fileServiceFactory = new FileServiceFactory(
      coreStart.savedObjects,
      blobStorageService,
      this.securitySetup,
      fileKindsRegistry,
      this.logger.get('files-service')
    );
    return {
      fileServiceFactory: this.fileServiceFactory,
    };
  }

  public stop() {}
}
