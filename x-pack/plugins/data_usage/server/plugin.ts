/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DataUsageConfigType, createConfig } from './config';
import type {
  DataUsageContext,
  DataUsageRequestHandlerContext,
  DataUsageServerSetup,
  DataUsageServerStart,
  DataUsageSetupDependencies,
  DataUsageStartDependencies,
} from './types';
import { registerDataUsageRoutes } from './routes';
import { PLUGIN_ID } from '../common';
import { appContextService } from './app_context';

export class DataUsagePlugin
  implements
    Plugin<
      DataUsageServerSetup,
      DataUsageServerStart,
      DataUsageSetupDependencies,
      DataUsageStartDependencies
    >
{
  private readonly logger: Logger;
  private dataUsageContext: DataUsageContext;

  constructor(context: PluginInitializerContext<DataUsageConfigType>) {
    const serverConfig = createConfig(context);

    this.logger = context.logger.get();

    this.logger.debug('data usage plugin initialized');

    this.dataUsageContext = {
      config$: context.config.create<DataUsageConfigType>(),
      configInitialValue: context.config.get(),
      logFactory: context.logger,
      get serverConfig() {
        return serverConfig;
      },
      kibanaVersion: context.env.packageInfo.version,
      kibanaBranch: context.env.packageInfo.branch,
      kibanaInstanceId: context.env.instanceUuid,
    };
  }
  setup(coreSetup: CoreSetup, pluginsSetup: DataUsageSetupDependencies): DataUsageServerSetup {
    this.logger.debug('data usage plugin setup');
    pluginsSetup.features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      management: {
        data: [PLUGIN_ID],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['monitor'],
          ui: [],
        },
      ],
    });
    const router = coreSetup.http.createRouter<DataUsageRequestHandlerContext>();
    registerDataUsageRoutes(router, this.dataUsageContext);

    return {};
  }

  start(_coreStart: CoreStart, _pluginsStart: DataUsageStartDependencies): DataUsageServerStart {
    appContextService.start({
      logFactory: this.dataUsageContext.logFactory,
      configInitialValue: this.dataUsageContext.configInitialValue,
      serverConfig: this.dataUsageContext.serverConfig,
      config$: this.dataUsageContext.config$,
      kibanaVersion: this.dataUsageContext.kibanaVersion,
      kibanaBranch: this.dataUsageContext.kibanaBranch,
      kibanaInstanceId: this.dataUsageContext.kibanaInstanceId,
      cloud: this.dataUsageContext.cloud,
    });
    return {};
  }

  public stop() {
    this.logger.debug('Stopping data usage plugin');
  }
}
