/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '../../../../src/core/server';
import { initServerWithKibana } from './kibana.index';

interface UptimePluginsSetup {
  usageCollection: any;
}

export class UptimePlugin implements Plugin {
  public async setup(coreSetup: CoreSetup, plugins: UptimePluginsSetup) {
    const { usageCollection } = plugins;

    initServerWithKibana(
      {
        router: coreSetup.http.createRouter(),
      },
      {
        usageCollection,
      }
    );
  }

  public start() {}

  public stop() {}
}

export function plugin(_initializerContext: PluginInitializerContext) {
  return new Plugin();
}
