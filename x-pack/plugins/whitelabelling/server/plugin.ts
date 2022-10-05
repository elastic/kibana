/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { WhitelabellingRequestHandlerContext } from './types';
import { registerRoutes } from './routes';
import { ConfigSchema } from '../config';

export class WhitelabellingPlugin implements Plugin {
  private readonly config: ConfigSchema;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.config = initializerContext.config.get();
  }

  public setup(core: CoreSetup, initializerContext: PluginInitializerContext<ConfigSchema>) {
    const router = core.http.createRouter<WhitelabellingRequestHandlerContext>();
    registerRoutes(router, this.config);
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}

export { WhitelabellingPlugin as Plugin };
