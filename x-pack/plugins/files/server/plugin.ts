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

import { PLUGIN_ID } from '../common/constants';

import { BlobStorageService } from './blob_storage_service';
import { FileServiceFactory } from './file_service';
import type { FilesPluginSetupDependencies, FilesSetup, FilesStart } from './types';
import {
  setFileKindsRegistry,
  getFileKindsRegistry,
  FileKindsRegistryImpl,
} from './file_kinds_registry';
import type { FilesRequestHandlerContext, FilesRouter } from './routes/types';
import { registerRoutes } from './routes';
import { registerUsageCollector } from './usage';

export class FilesPlugin implements Plugin<FilesSetup, FilesStart, FilesPluginSetupDependencies> {
  private readonly logger: Logger;
  private fileServiceFactory: undefined | FileServiceFactory;
  private securitySetup: FilesPluginSetupDependencies['security'];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    { security, usageCollection }: FilesPluginSetupDependencies
  ): FilesSetup {
    FileServiceFactory.setup(core.savedObjects);
    this.securitySetup = security;

    core.http.registerRouteHandlerContext<FilesRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      async (ctx, req) => {
        return {
          fileService: {
            asCurrentUser: () => this.fileServiceFactory!.asScoped(req),
            asInternalUser: () => this.fileServiceFactory!.asInternal(),
            logger: this.logger.get('files-routes'),
          },
        };
      }
    );

    const router: FilesRouter = core.http.createRouter();
    registerRoutes(router);
    setFileKindsRegistry(new FileKindsRegistryImpl(router));
    registerUsageCollector({
      usageCollection,
      getFileService: () => this.fileServiceFactory?.asInternal(),
    });

    return {
      registerFileKind(fileKind) {
        getFileKindsRegistry().register(fileKind);
      },
    };
  }

  public start(coreStart: CoreStart): FilesStart {
    const { savedObjects } = coreStart;
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const blobStorageService = new BlobStorageService(
      esClient,
      this.logger.get('blob-storage-service')
    );
    this.fileServiceFactory = new FileServiceFactory(
      savedObjects,
      blobStorageService,
      this.securitySetup,
      getFileKindsRegistry(),
      this.logger.get('files-service')
    );

    return {
      fileServiceFactory: this.fileServiceFactory,
    };
  }

  public stop() {}
}
