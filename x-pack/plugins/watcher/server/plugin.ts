/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'kibana/server' {
  interface RequestHandlerContext {
    watcher?: WatcherContext;
  }
}

import {
  CoreSetup,
  IScopedClusterClient,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'kibana/server';
import { PLUGIN } from '../common/constants';
import { Dependencies, LicenseStatus, RouteDependencies } from './types';
import { LICENSE_CHECK_STATE } from '../../licensing/server';

import { registerSettingsRoutes } from './routes/api/settings';
import { registerIndicesRoutes } from './routes/api/indices';
import { registerLicenseRoutes } from './routes/api/license';
import { registerWatchesRoutes } from './routes/api/watches';
import { registerWatchRoutes } from './routes/api/watch';
import { registerListFieldsRoute } from './routes/api/register_list_fields_route';
import { registerLoadHistoryRoute } from './routes/api/register_load_history_route';
import { elasticsearchJsPlugin } from './lib/elasticsearch_js_plugin';

export interface WatcherContext {
  client: IScopedClusterClient;
}

export class WatcherServerPlugin implements Plugin<void, void, any, any> {
  log: Logger;

  private licenseStatus: LicenseStatus = {
    hasRequired: false,
  };

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
  }

  async setup(
    { http, elasticsearch: elasticsearchService }: CoreSetup,
    { licensing }: Dependencies
  ) {
    const router = http.createRouter();
    const routeDependencies: RouteDependencies = {
      router,
      getLicenseStatus: () => this.licenseStatus,
    };

    const config = { plugins: [elasticsearchJsPlugin] };
    const watcherESClient = elasticsearchService.createClient('watcher', config);
    http.registerRouteHandlerContext('watcher', (ctx, request) => {
      return {
        client: watcherESClient.asScoped(request),
      };
    });

    registerListFieldsRoute(routeDependencies);
    registerLoadHistoryRoute(routeDependencies);
    registerIndicesRoutes(routeDependencies);
    registerLicenseRoutes(routeDependencies);
    registerSettingsRoutes(routeDependencies);
    registerWatchesRoutes(routeDependencies);
    registerWatchRoutes(routeDependencies);

    licensing.license$.subscribe(async license => {
      const { state, message } = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);
      const hasMinimumLicense = state === LICENSE_CHECK_STATE.Valid;
      if (hasMinimumLicense && license.getFeature(PLUGIN.ID)) {
        this.log.info('Enabling Watcher plugin.');
        this.licenseStatus = {
          hasRequired: true,
        };
      } else {
        if (message) {
          this.log.info(message);
        }
        this.licenseStatus = {
          hasRequired: false,
          message,
        };
      }
    });
  }
  start() {}
  stop() {}
}
