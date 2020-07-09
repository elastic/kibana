/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { CoreSetup } from 'src/core/server';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesServiceSetup } from '../../spaces/server';

import { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';
import { ListClient } from './services/lists/list_client';
import {
  ContextProvider,
  ContextProviderReturn,
  ListPluginSetup,
  ListsPluginStart,
  PluginsSetup,
} from './types';
import { createConfig$ } from './create_config';
import { getSpaceId } from './get_space_id';
import { getUser } from './get_user';
import { initSavedObjects } from './saved_objects';
import { ExceptionListClient } from './services/exception_lists/exception_list_client';

export class ListPlugin
  implements Plugin<Promise<ListPluginSetup>, ListsPluginStart, PluginsSetup> {
  private readonly logger: Logger;
  private spaces: SpacesServiceSetup | undefined | null;
  private config: ConfigType | undefined | null;
  private security: SecurityPluginSetup | undefined | null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup): Promise<ListPluginSetup> {
    const config = await createConfig$(this.initializerContext).pipe(first()).toPromise();
    this.spaces = plugins.spaces?.spacesService;
    this.config = config;
    this.security = plugins.security;

    initSavedObjects(core.savedObjects);

    core.http.registerRouteHandlerContext('lists', this.createRouteHandlerContext());
    const router = core.http.createRouter();
    initRoutes(router, config);

    return {
      getExceptionListClient: (savedObjectsClient, user): ExceptionListClient => {
        return new ExceptionListClient({
          savedObjectsClient,
          user,
        });
      },
      getListClient: (callCluster, spaceId, user): ListClient => {
        return new ListClient({
          callCluster,
          config,
          spaceId,
          user,
        });
      },
    };
  }

  public start(): void {
    this.logger.debug('Starting plugin');
  }

  public stop(): void {
    this.logger.debug('Stopping plugin');
  }

  private createRouteHandlerContext = (): ContextProvider => {
    return async (context, request): ContextProviderReturn => {
      const { spaces, config, security } = this;
      const {
        core: {
          savedObjects: { client: savedObjectsClient },
          elasticsearch: {
            legacy: {
              client: { callAsCurrentUser: callCluster },
            },
          },
        },
      } = context;
      if (config == null) {
        throw new TypeError('Configuration is required for this plugin to operate');
      } else {
        const spaceId = getSpaceId({ request, spaces });
        const user = getUser({ request, security });
        return {
          getExceptionListClient: (): ExceptionListClient =>
            new ExceptionListClient({
              savedObjectsClient,
              user,
            }),
          getListClient: (): ListClient =>
            new ListClient({
              callCluster,
              config,
              spaceId,
              user,
            }),
        };
      }
    };
  };
}
