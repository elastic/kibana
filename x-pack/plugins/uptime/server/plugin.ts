/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { once } from 'lodash';
import {
  PluginInitializerContext,
  CoreStart,
  CoreSetup,
  Plugin as PluginType,
  ISavedObjectsRepository,
} from '../../../../src/core/server';
import { uptimeRuleFieldMap } from '../common/rules/uptime_rule_field_map';
import { initServerWithKibana } from './kibana.index';
import { KibanaTelemetryAdapter, UptimeCorePlugins } from './lib/adapters';
import { umDynamicSettings } from './lib/saved_objects';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { RuleDataClient } from '../../rule_registry/server';
import { TECHNICAL_COMPONENT_TEMPLATE_NAME } from '../../rule_registry/common/assets';

export type UptimeRuleRegistry = ReturnType<Plugin['setup']>['ruleRegistry'];

export class Plugin implements PluginType {
  private savedObjectsClient?: ISavedObjectsRepository;
  private initContext: PluginInitializerContext;

  constructor(_initializerContext: PluginInitializerContext) {
    this.initContext = _initializerContext;
  }

  public setup(core: CoreSetup, plugins: UptimeCorePlugins) {
    const getCoreStart = () => core.getStartServices().then(([coreStart]) => coreStart);

    const { ruleDataService } = plugins.ruleRegistry;

    const ready = once(async () => {
      const componentTemplateName = ruleDataService.getFullAssetName('synthetics-mappings');

      if (!ruleDataService.isWriteEnabled()) {
        return;
      }

      await ruleDataService.createOrUpdateComponentTemplate({
        name: componentTemplateName,
        body: {
          template: {
            settings: {
              number_of_shards: 1,
            },
            mappings: mappingFromFieldMap(uptimeRuleFieldMap),
          },
        },
      });

      await ruleDataService.createOrUpdateIndexTemplate({
        name: ruleDataService.getFullAssetName('synthetics-index-template'),
        body: {
          index_patterns: [ruleDataService.getFullAssetName('observability-synthetics*')],
          composed_of: [
            ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
            componentTemplateName,
          ],
        },
      });
    });

    const ruleDataClient = new RuleDataClient({
      alias: ruleDataService.getFullAssetName('observability-synthetics'),
      getClusterClient: async () => {
        const coreStart = await getCoreStart();
        return coreStart.elasticsearch.client.asInternalUser;
      },
      ready,
    });

    initServerWithKibana(
      { router: core.http.createRouter() },
      plugins,
      ruleDataClient,
      this.initContext.logger.get()
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
