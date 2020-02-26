/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreStart, CoreSetup } from '../../../../src/core/server';
import { initServerWithKibana } from './kibana.index';
import { UptimeCorePlugins } from './lib/adapters';
import { umDynamicSettings } from './lib/saved_object_mappings';

export class Plugin {
  constructor(_initializerContext: PluginInitializerContext) {}
  public setup(core: CoreSetup, plugins: UptimeCorePlugins) {
    initServerWithKibana({ route: core.http.createRouter() }, plugins);
    core.savedObjects.registerType(umDynamicSettings);
  }
  public start(_core: CoreStart, _plugins: any) {}
}
