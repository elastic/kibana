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
} from '../../../../src/core/server';
import { SessionViewSetupPlugins, SessionViewStartPlugins } from './types';
import { registerRoutes } from './routes';
import { getTestSavedObject } from './saved_objects';

export class SessionViewPlugin implements Plugin {
  private logger: Logger;

  /**
   * Initialize SessionViewPlugin class properties (logger, etc) that is accessible
   * through the initializerContext.
   */
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: SessionViewSetupPlugins) {
    const { savedObjects } = core;
    this.logger.debug('session view: Setup');
    const router = core.http.createRouter();

    // Register server routes
    registerRoutes(router, this.logger);

    // Register saved objects
    savedObjects.registerType(getTestSavedObject());
  }

  public start(core: CoreStart, plugins: SessionViewStartPlugins) {
    this.logger.debug('session view: Start');
  }

  public stop() {
    this.logger.debug('session view: Stop');
  }
}
