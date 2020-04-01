/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreStart,
  CoreSetup,
  Plugin as PluginType,
  ISavedObjectsRepository,
} from '../../../../src/core/server';
import { initServerWithKibana } from './kibana.index';
import { KibanaTelemetryAdapter, UptimeCorePlugins } from './lib/adapters';
import { umDynamicSettings } from './lib/saved_objects';

interface UptimePluginsSetup {
  features: PluginSetupContract;
  usageCollection: UsageCollectionSetup;
}

export class Plugin implements PluginType {
  private savedObjectsClient?: ISavedObjectsRepository;

  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: UptimeCorePlugins) {
    initServerWithKibana({ router: core.http.createRouter() }, plugins);
    core.savedObjects.registerType(umDynamicSettings);
    KibanaTelemetryAdapter.registerUsageCollector(
      plugins.usageCollection,
      () => this.savedObjectsClient
    );
  }

  public start(_core: CoreStart, _plugins: any) {
    this.savedObjectsClient = _core.savedObjects.createInternalRepository();
  }

  public stop() {}
}
