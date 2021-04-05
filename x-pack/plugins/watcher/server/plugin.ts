/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  CoreSetup,
  CoreStart,
  ILegacyCustomClusterClient,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'kibana/server';

import { PLUGIN, INDEX_NAMES } from '../common/constants';
import type {
  SetupDependencies,
  StartDependencies,
  RouteDependencies,
  WatcherRequestHandlerContext,
} from './types';

import { registerSettingsRoutes } from './routes/api/settings';
import { registerIndicesRoutes } from './routes/api/indices';
import { registerLicenseRoutes } from './routes/api/license';
import { registerWatchesRoutes } from './routes/api/watches';
import { registerWatchRoutes } from './routes/api/watch';
import { registerListFieldsRoute } from './routes/api/register_list_fields_route';
import { registerLoadHistoryRoute } from './routes/api/register_load_history_route';
import { elasticsearchJsPlugin } from './lib/elasticsearch_js_plugin';
import { License, isEsError } from './shared_imports';

async function getCustomEsClient(getStartServices: CoreSetup['getStartServices']) {
  const [core] = await getStartServices();
  const esConfig = { plugins: [elasticsearchJsPlugin] };
  return core.elasticsearch.legacy.createClient('watcher', esConfig);
}

export class WatcherServerPlugin implements Plugin<void, void, any, any> {
  private readonly license: License;
  private readonly logger: Logger;
  private watcherESClient?: ILegacyCustomClusterClient;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.license = new License();
  }

  setup({ http, getStartServices }: CoreSetup, { licensing, features }: SetupDependencies) {
    this.license.setup({
      pluginName: PLUGIN.getI18nName(i18n),
      logger: this.logger,
    });

    features.registerElasticsearchFeature({
      id: 'watcher',
      management: {
        insightsAndAlerting: ['watcher'],
      },
      catalogue: ['watcher'],
      privileges: [
        {
          requiredClusterPrivileges: ['manage_watcher'],
          requiredIndexPrivileges: {
            [INDEX_NAMES.WATCHES]: ['read'],
            [INDEX_NAMES.WATCHER_HISTORY]: ['read'],
          },
          ui: [],
        },
        {
          requiredClusterPrivileges: ['monitor_watcher'],
          requiredIndexPrivileges: {
            [INDEX_NAMES.WATCHES]: ['read'],
            [INDEX_NAMES.WATCHER_HISTORY]: ['read'],
          },
          ui: [],
        },
      ],
    });

    http.registerRouteHandlerContext<WatcherRequestHandlerContext, 'watcher'>(
      'watcher',
      async (ctx, request) => {
        this.watcherESClient = this.watcherESClient ?? (await getCustomEsClient(getStartServices));
        return {
          client: this.watcherESClient.asScoped(request),
        };
      }
    );

    const router = http.createRouter<WatcherRequestHandlerContext>();
    const routeDependencies: RouteDependencies = {
      router,
      license: this.license,
      lib: { isEsError },
    };

    registerListFieldsRoute(routeDependencies);
    registerLoadHistoryRoute(routeDependencies);
    registerIndicesRoutes(routeDependencies);
    registerLicenseRoutes(routeDependencies);
    registerSettingsRoutes(routeDependencies);
    registerWatchesRoutes(routeDependencies);
    registerWatchRoutes(routeDependencies);
  }

  start(core: CoreStart, { licensing }: StartDependencies) {
    this.license.start({
      pluginId: PLUGIN.ID,
      minimumLicenseType: PLUGIN.MINIMUM_LICENSE_REQUIRED,
      licensing,
    });
  }

  stop() {
    if (this.watcherESClient) {
      this.watcherESClient.close();
    }
  }
}
