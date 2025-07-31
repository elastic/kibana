/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  LoggerFactory,
} from '@kbn/core/server';
import { registerRoutes } from './routes';
import { registerFeatures } from './features';
import type { InternalServices } from './services/types';
import { createServices } from './services/create_services';
import type { WorkChatAppConfig } from './config';
import { AppLogger } from './utils';
import { DataSourcesRegistry } from './services/data_source';
import type {
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  WorkChatAppPluginSetupDependencies,
  WorkChatAppPluginStartDependencies,
} from './types';

export class WorkChatAppPlugin
  implements
    Plugin<
      WorkChatAppPluginSetup,
      WorkChatAppPluginStart,
      WorkChatAppPluginSetupDependencies,
      WorkChatAppPluginStartDependencies
    >
{
  private readonly loggerFactory: LoggerFactory;
  private readonly config: WorkChatAppConfig;
  private readonly dataSourcesRegistry: DataSourcesRegistry;
  private services?: InternalServices;

  constructor(context: PluginInitializerContext) {
    this.loggerFactory = context.logger;
    AppLogger.setInstance(this.loggerFactory.get('workchat.app'));
    this.config = context.config.get<WorkChatAppConfig>();
    this.dataSourcesRegistry = new DataSourcesRegistry();
  }

  public setup(
    core: CoreSetup<WorkChatAppPluginStartDependencies>,
    setupDeps: WorkChatAppPluginSetupDependencies
  ): WorkChatAppPluginSetup {
    const router = core.http.createRouter();
    registerRoutes({
      core,
      router,
      logger: this.loggerFactory.get('routes'),
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before #start');
        }
        return this.services;
      },
    });

    registerFeatures({ features: setupDeps.features });

    return {
      dataSourcesRegistry: {
        register: (dataSource) => {
          return this.dataSourcesRegistry.register(dataSource);
        },
      },
    };
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WorkChatAppPluginStartDependencies
  ): WorkChatAppPluginStart {
    // Block further registrations after start
    this.dataSourcesRegistry.blockRegistration();

    this.services = createServices({
      core,
      config: this.config,
      loggerFactory: this.loggerFactory,
      pluginsDependencies,
      dataSourcesRegistry: this.dataSourcesRegistry,
    });

    return {};
  }
}
