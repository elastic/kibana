/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CoreSetup,
  ICustomClusterClient,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';

import { registerRoutes } from './routes';

interface SetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
}

export class LogstashPlugin implements Plugin {
  private readonly logger: Logger;
  private esClient?: ICustomClusterClient;
  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup, deps: SetupDeps) {
    this.logger.debug('Setting up Logstash plugin');
    const esClient = core.elasticsearch.createClient('logstash');

    registerRoutes(core.http.createRouter(), esClient, deps.security);
  }

  start() {}
  stop() {
    if (this.esClient) {
      this.esClient.close();
    }
  }
}
