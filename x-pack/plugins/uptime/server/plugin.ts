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
  Logger,
} from '../../../../src/core/server';
import { uptimeRuleFieldMap } from '../common/rules/uptime_rule_field_map';
import { initServerWithKibana } from './kibana.index';
import { KibanaTelemetryAdapter, UptimeCorePlugins } from './lib/adapters';
import { umDynamicSettings } from './lib/saved_objects';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { Dataset } from '../../rule_registry/server';

export type UptimeRuleRegistry = ReturnType<Plugin['setup']>['ruleRegistry'];

export class Plugin implements PluginType {
  private savedObjectsClient?: ISavedObjectsRepository;
  private initContext: PluginInitializerContext;
  private logger?: Logger;

  constructor(_initializerContext: PluginInitializerContext) {
    this.initContext = _initializerContext;
  }

  public setup(core: CoreSetup, plugins: UptimeCorePlugins) {
    this.logger = this.initContext.logger.get();
    const { ruleDataService } = plugins.ruleRegistry;

    const ruleDataClient = ruleDataService.initializeIndex({
      feature: 'uptime',
      registrationContext: 'observability.uptime',
      dataset: Dataset.alerts,
      componentTemplateRefs: [],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(uptimeRuleFieldMap, 'strict'),
        },
      ],
    });

    initServerWithKibana(
      { router: core.http.createRouter() },
      plugins,
      ruleDataClient,
      this.logger
    );
    core.savedObjects.registerType(umDynamicSettings);
    KibanaTelemetryAdapter.registerUsageCollector(
      plugins.usageCollection,
      () => this.savedObjectsClient
    );

    return {
      ruleRegistry: ruleDataClient,
    };
  }

  public start(core: CoreStart, _plugins: any) {
    this.savedObjectsClient = core.savedObjects.createInternalRepository();
  }

  public stop() {}
}
