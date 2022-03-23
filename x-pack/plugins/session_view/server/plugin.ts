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
} from '../../../../src/core/server';
import { SessionViewSetupPlugins, SessionViewStartPlugins } from './types';
import { registerRoutes } from './routes';

export class SessionViewPlugin implements Plugin {
  private logger: Logger;
  private router: IRouter | undefined;

  /**
   * Initialize SessionViewPlugin class properties (logger, etc) that is accessible
   * through the initializerContext.
   */
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: SessionViewSetupPlugins) {
    this.logger.debug('session view: Setup');
    this.router = core.http.createRouter();
  }

  public start(core: CoreStart, plugins: SessionViewStartPlugins) {
    this.logger.debug('session view: Start');

    // Register server routes
    if (this.router) {
      registerRoutes(this.router, plugins.ruleRegistry);
    }
  }

  public stop() {
    this.logger.debug('session view: Stop');
  }
}
