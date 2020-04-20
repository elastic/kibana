/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { ElasticsearchServiceSetup, Logger, PluginInitializerContext } from 'kibana/server';
import { CoreSetup } from 'src/core/server';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesServiceSetup } from '../../spaces/server';

import { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';
import { ListsClient } from './services/lists/client';
import { ContextProvider, ContextProviderReturn, PluginsSetup } from './types';
import { createConfig$ } from './create_config';

export class ListsPlugin {
  private readonly logger: Logger;
  private spaces: SpacesServiceSetup | undefined | null;
  private config: ConfigType | undefined | null;
  private elasticsearch: ElasticsearchServiceSetup | undefined | null;
  private security: SecurityPluginSetup | undefined | null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup): Promise<void> {
    const config = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();

    if (config.enabled) {
      this.spaces = plugins.spaces?.spacesService;
      this.config = config;
      this.elasticsearch = core.elasticsearch;
      this.security = plugins.security;

      core.http.registerRouteHandlerContext('lists', this.createRouteHandlerContext());
      const router = core.http.createRouter();
      initRoutes(router);
    }
  }

  public start(): void {
    this.logger.debug('Starting plugin');
  }

  public stop(): void {
    this.logger.debug('Stopping plugin');
  }

  private createRouteHandlerContext = (): ContextProvider => {
    return async (context, request): ContextProviderReturn => {
      const { spaces, config, security, elasticsearch } = this;
      const {
        core: {
          elasticsearch: { dataClient },
        },
      } = context;
      if (config == null) {
        throw new TypeError('Configuration is required for this plugin to operate');
      } else if (elasticsearch == null) {
        throw new TypeError('Elastic Search is required for this plugin to operate');
      } else if (security == null) {
        // TODO: This might be null, test authentication being turned off.
        throw new TypeError('Security plugin is required for this plugin to operate');
      } else {
        return {
          getListsClient: (): ListsClient =>
            new ListsClient({
              config,
              dataClient,
              request,
              security,
              spaces,
            }),
        };
      }
    };
  };
}
