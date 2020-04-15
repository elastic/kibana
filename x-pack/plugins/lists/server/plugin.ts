/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import {
  Logger,
  PluginInitializerContext,
  IContextProvider,
  RequestHandler,
  ElasticsearchServiceSetup,
} from 'kibana/server';
import { CoreSetup } from 'src/core/server';
import { Observable } from 'rxjs';

import { SpacesPluginSetup, SpacesServiceSetup } from '../../spaces/server';
import { SecurityPluginSetup } from '../../security/server';

import { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';
import { ListsClient } from './client';

const createConfig$ = (
  context: PluginInitializerContext
): Observable<Readonly<{
  enabled: boolean;
  listsIndex: string;
  listsItemsIndex: string;
}>> => {
  return context.config.create<ConfigType>().pipe(map(config => config));
};

export interface PluginsSetup {
  security: SecurityPluginSetup;
  spaces: SpacesPluginSetup | undefined | null;
}

export class ListsPlugin {
  private readonly logger: Logger;
  private spaces: SpacesServiceSetup | undefined | null;
  private config: ConfigType | undefined | null;
  private elasticsearch: ElasticsearchServiceSetup | undefined | null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup): Promise<void> {
    const config = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();

    if (!config.enabled) {
      return;
    }
    this.spaces = plugins.spaces?.spacesService;
    this.config = config;
    this.elasticsearch = core.elasticsearch;

    core.http.registerRouteHandlerContext('lists', this.createRouteHandlerContext());
    const router = core.http.createRouter();
    initRoutes(router, config);
  }

  public start(): void {
    this.logger.debug('Starting plugin');
  }

  public stop(): void {
    this.logger.debug('Stopping plugin');
  }

  private createRouteHandlerContext = (): IContextProvider<
    RequestHandler<unknown, unknown, unknown>,
    'lists'
  > => {
    return async (
      context,
      request
    ): Promise<{
      getListsClient: () => ListsClient;
    }> => {
      const { spaces, config, logger, elasticsearch } = this;
      const {
        core: {
          elasticsearch: { dataClient },
        },
      } = context;
      if (config == null) {
        throw new TypeError('Configuration is required for this plugin to operate');
      } else if (elasticsearch == null) {
        throw new TypeError('Elastic Search is required for this plugin to operate');
      } else {
        return {
          getListsClient: (): ListsClient =>
            new ListsClient({
              request,
              spaces,
              config,
              logger,
              dataClient,
            }),
        };
      }
    };
  };
}
