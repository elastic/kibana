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
import type { FilesPluginSetupDependencies, FilesPluginSetup, FilesPluginStart } from './types';
import { fileKindsRegistry } from './file_kinds_registry';
import type { FilesRequestHandlerContext, FilesRouter } from './routes/types';
import { registerRoutes } from './routes';

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

    core
      .getStartServices()
      .then(() => {
        // File routes can only be registered during start phase because we need
        // to give plugins a chance to register file kinds.
        registerRoutes(router);
      })
      .catch(() => {
        this.logger.error('Failed to register routes, file services may not function properly.');
      });

    return {
      registerFileKind(fileKind) {
        fileKindsRegistry.register(fileKind);
      },
    };
  }

  public start(coreStart: CoreStart): FilesPluginStart {
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
      fileKindsRegistry,
      this.logger.get('files-service')
    );

    return {
      fileServiceFactory: this.fileServiceFactory,
    };
  }

  public stop() {}
}
