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
  private services?: InternalServices;

  constructor(context: PluginInitializerContext) {
    this.loggerFactory = context.logger;
    AppLogger.setInstance(this.loggerFactory.get('workchat.app'));
    this.config = context.config.get<WorkChatAppConfig>();
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

    return {};
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WorkChatAppPluginStartDependencies
  ): WorkChatAppPluginStart {
    this.services = createServices({
      core,
      config: this.config,
      loggerFactory: this.loggerFactory,
      pluginsDependencies,
    });

    return {};
  }
}
