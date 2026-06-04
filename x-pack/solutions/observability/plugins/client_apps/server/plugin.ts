/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { ClientAppsConfig } from '.';
import { registerAndroidRoutes } from './platforms/android/routes';

export class ClientAppsPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup) {
    const config = this.initializerContext.config.get<ClientAppsConfig>();
    if (!config.enabled) {
      this.logger.info('Client Apps plugin is disabled');
      return {};
    }

    const router = core.http.createRouter();
    const params = { router, logger: this.logger };

    registerAndroidRoutes(params);

    this.logger.info('Client Apps plugin routes registered');
    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
