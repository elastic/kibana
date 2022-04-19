/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';

import { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';
import { ListClient } from './services/lists/list_client';
import type {
  ContextProvider,
  ContextProviderReturn,
  ListPluginSetup,
  ListsPluginStart,
  ListsRequestHandlerContext,
  PluginsStart,
} from './types';
import { getSpaceId } from './get_space_id';
import { getUser } from './get_user';
import { initSavedObjects } from './saved_objects';
import { ExceptionListClient } from './services/exception_lists/exception_list_client';
import {
  ExtensionPointStorage,
  ExtensionPointStorageClientInterface,
  ExtensionPointStorageInterface,
} from './services/extension_points';

export class ListPlugin implements Plugin<ListPluginSetup, ListsPluginStart, {}, PluginsStart> {
  private readonly logger: Logger;
  private readonly config: ConfigType;
  private readonly extensionPoints: ExtensionPointStorageInterface;
  private spaces: SpacesServiceStart | undefined | null;
  private security: SecurityPluginStart | undefined | null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
    this.config = this.initializerContext.config.get<ConfigType>();
    this.extensionPoints = new ExtensionPointStorage(this.logger);
  }

  public setup(core: CoreSetup): ListPluginSetup {
    const { config } = this;

    initSavedObjects(core.savedObjects);

    core.http.registerRouteHandlerContext<ListsRequestHandlerContext, 'lists'>(
      'lists',
      this.createRouteHandlerContext()
    );
    const router = core.http.createRouter<ListsRequestHandlerContext>();
    initRoutes(router, config);

    return {
      getExceptionListClient: (
        savedObjectsClient,
        user,
        enableServerExtensionPoints = true
      ): ExceptionListClient => {
        return new ExceptionListClient({
          enableServerExtensionPoints,
          savedObjectsClient,
          serverExtensionsClient: this.extensionPoints.getClient(),
          user,
        });
      },
      getListClient: (esClient, spaceId, user): ListClient => {
        return new ListClient({
          config,
          esClient,
          spaceId,
          user,
        });
      },
      registerExtension: (extension): void => {
        this.extensionPoints.add(extension);
      },
    };
  }

  public start(core: CoreStart, plugins: PluginsStart): ListsPluginStart {
    this.logger.debug('Starting plugin');
    this.security = plugins.security;
    this.spaces = plugins.spaces?.spacesService;
  }

  public stop(): void {
    this.extensionPoints.clear();
    this.logger.debug('Stopping plugin');
  }

  private createRouteHandlerContext = (): ContextProvider => {
    return async (context, request): ContextProviderReturn => {
      const { spaces, config, security, extensionPoints } = this;
      const {
        savedObjects: { client: savedObjectsClient },
        elasticsearch: {
          client: { asCurrentUser: esClient },
        },
      } = await context.core;
      if (config == null) {
        throw new TypeError('Configuration is required for this plugin to operate');
      } else {
        const spaceId = getSpaceId({ request, spaces });
        const user = getUser({ request, security });
        return {
          getExceptionListClient: (): ExceptionListClient =>
            new ExceptionListClient({
              request,
              savedObjectsClient,
              serverExtensionsClient: this.extensionPoints.getClient(),
              user,
            }),
          getExtensionPointClient: (): ExtensionPointStorageClientInterface =>
            extensionPoints.getClient(),
          getListClient: (): ListClient =>
            new ListClient({
              config,
              esClient,
              spaceId,
              user,
            }),
        };
      }
    };
  };
}
