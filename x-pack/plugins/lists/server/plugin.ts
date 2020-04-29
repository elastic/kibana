/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { Logger, PluginInitializerContext } from 'kibana/server';
import { CoreSetup } from 'src/core/server';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesServiceSetup } from '../../spaces/server';

import { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';
import { ListClient } from './services/lists/client';
import { ContextProvider, ContextProviderReturn, PluginsSetup } from './types';
import { createConfig$ } from './create_config';
import { getSpaceId } from './get_space_id';
import { getUser } from './get_user';

export class ListPlugin {
  private readonly logger: Logger;
  private spaces: SpacesServiceSetup | undefined | null;
  private config: ConfigType | undefined | null;
  private security: SecurityPluginSetup | undefined | null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup): Promise<void> {
    const config = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();

    this.logger.error(
      'You have activated the lists values feature flag which is NOT currently supported for Elastic Security! You should turn this feature flag off immediately by un-setting "xpack.lists.enabled: true" in kibana.yml and restarting Kibana'
    );
    this.spaces = plugins.spaces?.spacesService;
    this.config = config;
    this.security = plugins.security;

    core.http.registerRouteHandlerContext('lists', this.createRouteHandlerContext());
    const router = core.http.createRouter();
    initRoutes(router);
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
          elasticsearch: {
            dataClient: { callAsCurrentUser },
          },
        },
      } = context;
      if (config == null) {
        throw new TypeError('Configuration is required for this plugin to operate');
      } else {
        const spaceId = getSpaceId({ request, spaces });
        const user = getUser({ request, security });
        return {
          getListClient: (): ListClient =>
            new ListClient({
              callCluster: callAsCurrentUser,
              config,
              request,
              security,
              spaceId,
              user,
            }),
        };
      }
    };
  };
}
