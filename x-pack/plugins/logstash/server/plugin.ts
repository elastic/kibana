/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';

import { registerRoutes } from './routes';

interface SetupDeps {
  licensing: LicensingPluginSetup;
}

export class LogstashPlugin implements Plugin {
  private readonly logger: Logger;
  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup, deps: SetupDeps) {
    this.logger.debug('Setting up Logstash plugin');
    registerRoutes(core.http.createRouter());
  }

  start() {}
  stop() {}
}
