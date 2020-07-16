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

import { i18n } from '@kbn/i18n';

import {
  CoreSetup,
  CoreStart,
  ILegacyCustomClusterClient,
  ILegacyScopedClusterClient,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'kibana/server';
import { PLUGIN } from '../common/constants';
import { SetupDependencies, StartDependencies, RouteDependencies } from './types';

import { registerSettingsRoutes } from './routes/api/settings';
import { registerIndicesRoutes } from './routes/api/indices';
import { registerLicenseRoutes } from './routes/api/license';
import { registerWatchesRoutes } from './routes/api/watches';
import { registerWatchRoutes } from './routes/api/watch';
import { registerListFieldsRoute } from './routes/api/register_list_fields_route';
import { registerLoadHistoryRoute } from './routes/api/register_load_history_route';
import { elasticsearchJsPlugin } from './lib/elasticsearch_js_plugin';
import { License } from './services';

export interface WatcherContext {
  client: ILegacyScopedClusterClient;
}

async function getCustomEsClient(getStartServices: CoreSetup['getStartServices']) {
  const [core] = await getStartServices();
  const esConfig = { plugins: [elasticsearchJsPlugin] };
  return core.elasticsearch.legacy.createClient('watcher', esConfig);
}

export class WatcherServerPlugin implements Plugin<void, void, any, any> {
  private readonly log: Logger;
  private watcherESClient?: ILegacyCustomClusterClient;
  private readonly license: License;

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
    this.license = new License();
  }

  async setup({ http, getStartServices }: CoreSetup, { licensing }: SetupDependencies) {
    const routeDependencies: RouteDependencies = {
      router: http.createRouter(),
      license: this.license,
    };

    licensing.featureUsage.register(PLUGIN.getI18nName(), PLUGIN.MINIMUM_LICENSE_REQUIRED);

    this.license.setup(
      {
        pluginId: PLUGIN.ID,
        minimumLicenseType: PLUGIN.MINIMUM_LICENSE_REQUIRED,
        defaultErrorMessage: i18n.translate('xpack.watcher.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.log,
      }
    );

    http.registerRouteHandlerContext('watcher', async (ctx, request) => {
      this.watcherESClient = this.watcherESClient ?? (await getCustomEsClient(getStartServices));
      return {
        client: this.watcherESClient.asScoped(request),
      };
    });

    registerListFieldsRoute(routeDependencies);
    registerLoadHistoryRoute(routeDependencies);
    registerIndicesRoutes(routeDependencies);
    registerLicenseRoutes(routeDependencies);
    registerSettingsRoutes(routeDependencies);
    registerWatchesRoutes(routeDependencies);
    registerWatchRoutes(routeDependencies);
  }

  start(core: CoreStart, { licensing }: StartDependencies) {
    this.license.start({ licensing });
  }

  stop() {
    if (this.watcherESClient) {
      this.watcherESClient.close();
    }
  }
}
