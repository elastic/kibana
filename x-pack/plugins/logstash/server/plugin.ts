/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CoreSetup,
  CoreStart,
  ILegacyCustomClusterClient,
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
  private esClient?: ILegacyCustomClusterClient;
  private coreSetup?: CoreSetup;
  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup, deps: SetupDeps) {
    this.logger.debug('Setting up Logstash plugin');

    this.coreSetup = core;
    registerRoutes(core.http.createRouter(), deps.security);
  }

  start(core: CoreStart) {
    const esClient = core.elasticsearch.legacy.createClient('logstash');

    this.coreSetup!.http.registerRouteHandlerContext('logstash', async (context, request) => {
      return { esClient: esClient.asScoped(request) };
    });
  }
  stop() {
    if (this.esClient) {
      this.esClient.close();
    }
  }
}
