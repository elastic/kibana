/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginInitializerContext,
  CoreStart,
  CoreSetup,
  Plugin as PluginType,
  ISavedObjectsRepository,
} from '../../../../src/core/server';
import { uptimeRuleFieldMap } from '../common/rules/uptime_rule_field_map';
import { uptimeRuleRegistrySettings } from '../common/rules/uptime_rule_registry_settings';
import { initServerWithKibana } from './kibana.index';
import { KibanaTelemetryAdapter, UptimeCorePlugins } from './lib/adapters';
import { umDynamicSettings } from './lib/saved_objects';

export type UptimeRuleRegistry = ReturnType<Plugin['setup']>['ruleRegistry'];

export class Plugin implements PluginType {
  private savedObjectsClient?: ISavedObjectsRepository;

  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: UptimeCorePlugins) {
    const uptimeRuleRegistry = plugins.observability.ruleRegistry.create({
      ...uptimeRuleRegistrySettings,
      fieldMap: uptimeRuleFieldMap,
    });

    initServerWithKibana({ router: core.http.createRouter() }, plugins, uptimeRuleRegistry);
    core.savedObjects.registerType(umDynamicSettings);
    KibanaTelemetryAdapter.registerUsageCollector(
      plugins.usageCollection,
      () => this.savedObjectsClient
    );

    return {
      ruleRegistry: uptimeRuleRegistry,
    };
  }

  public start(core: CoreStart, _plugins: any) {
    this.savedObjectsClient = core.savedObjects.createInternalRepository();
  }

  public stop() {}
}
