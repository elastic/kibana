/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import type { CoreSetup, CoreStart } from 'src/core/server';

import type { SecurityPluginStart } from '../../security/server';
import type { SpacesServiceStart } from '../../spaces/server';

import { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';
import { ListClient } from './services/lists/list_client';
import type {
  ContextProvider,
  ContextProviderReturn,
  ListPluginSetup,
  ListsPluginStart,
  PluginsStart,
} from './types';
import { createConfig$ } from './create_config';
import { getSpaceId } from './get_space_id';
import { getUser } from './get_user';
import { initSavedObjects } from './saved_objects';
import { ExceptionListClient } from './services/exception_lists/exception_list_client';

export class ListPlugin
  implements Plugin<Promise<ListPluginSetup>, ListsPluginStart, {}, PluginsStart> {
  private readonly logger: Logger;
  private spaces: SpacesServiceStart | undefined | null;
  private config: ConfigType | undefined | null;
  private security: SecurityPluginStart | undefined | null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup): Promise<ListPluginSetup> {
    const config = await createConfig$(this.initializerContext).pipe(first()).toPromise();
    this.config = config;

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

  public start(core: CoreStart, plugins: PluginsStart): void {
    this.logger.debug('Starting plugin');
    this.security = plugins.security;
    this.spaces = plugins.spaces?.spacesService;
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
