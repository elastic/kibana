/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { CustomBrandingRequestHandlerContext } from './types';
import { registerRoutes } from './routes';

export class CustomBrandingPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, initializerContext: PluginInitializerContext) {
    const router = core.http.createRouter<CustomBrandingRequestHandlerContext>();
    registerRoutes(router);
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}

export { CustomBrandingPlugin as Plugin };
