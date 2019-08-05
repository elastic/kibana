/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
} from '../../../../src/core/server';

import { IAuditLogPluginAPI } from './types';
import { PluginAPI } from './plugin_api';

/**
 * Represents the plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private readonly pluginAPI: IAuditLogPluginAPI;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
    this.logger.info('constructing plugin');

    this.pluginAPI = new PluginAPI(this.logger);
  }

  setup(core: CoreSetup): IAuditLogPluginAPI {
    this.logger.info('setting up plugin');
    return this.pluginAPI;
  }

  start(core: CoreStart): IAuditLogPluginAPI {
    this.logger.info('starting plugin');
    return this.pluginAPI;
  }

  stop() {
    this.logger.debug('Stopping plugin');
  }
}
