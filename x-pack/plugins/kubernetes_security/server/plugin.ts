/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  PluginInitializerContext,
  IRouter,
} from '@kbn/core/server';
import { KubernetesSecuritySetupPlugins, KubernetesSecurityStartPlugins } from './types';
import { registerRoutes } from './routes';

export class KubernetesSecurityPlugin implements Plugin {
  private logger: Logger;
  private router: IRouter | undefined;

  /**
   * Initialize KubernetesSecurityPlugin class properties (logger, etc) that is accessible
   * through the initializerContext.
   */
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: KubernetesSecuritySetupPlugins) {
    this.logger.debug('kubernetes security: Setup');
    this.router = core.http.createRouter();
  }

  public start(core: CoreStart, plugins: KubernetesSecurityStartPlugins) {
    this.logger.debug('kubernetes security: Start');

    // Register server routes
    if (this.router) {
      registerRoutes(this.router, plugins.ruleRegistry);
    }
  }

  public stop() {
    this.logger.debug('kubernetes security: Stop');
  }
}
