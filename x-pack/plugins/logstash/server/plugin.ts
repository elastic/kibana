/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { registerRoutes } from './routes';

interface SetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features: FeaturesPluginSetup;
}

export class LogstashPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup, deps: SetupDeps) {
    this.logger.debug('Setting up Logstash plugin');

    registerRoutes(core.http.createRouter(), deps.security);

    deps.features.registerElasticsearchFeature({
      id: 'pipelines',
      management: {
        ingest: ['pipelines'],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage_logstash_pipelines'],
          requiredIndexPrivileges: {},
          ui: [],
        },
      ],
    });
  }

  start(core: CoreStart) {}
}
