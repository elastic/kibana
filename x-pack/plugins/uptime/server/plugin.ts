/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '../../../../src/core/server';
import { initServerWithKibana } from './kibana.index';
import { PluginSetupContract } from '../../features/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';

interface UptimePluginsSetup {
  features: PluginSetupContract;
  usageCollection: UsageCollectionSetup;
}

export class UptimePlugin implements Plugin {
  public async setup(coreSetup: CoreSetup, plugins: UptimePluginsSetup) {
    initServerWithKibana(
      {
        router: coreSetup.http.createRouter(),
      },
      plugins
    );
  }

  public start() {}

  public stop() {}
}

export function plugin(_initializerContext: PluginInitializerContext) {
  return new Plugin();
}
