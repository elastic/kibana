/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  PluginInitializerContext,
  PluginName,
  CoreSetup,
  HttpServiceSetup,
} from '../../../../src/core/server';
import { registerRoutes } from './routes'

class Plugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: Record<PluginName, unknown>) {
    this.log.info(
      `Setting up Telemetry with core contract [${Object.keys(core)}] and deps [${Object.keys(
        deps
      )}]`
    );

    registerRoutes(core.http);

    return {

    };
  }

  public stop() {
    this.log.info(`Stopping Telemetry`);
  }
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new Plugin(initializerContext);
