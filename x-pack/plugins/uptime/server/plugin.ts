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
  SavedObjectsClient,
} from '../../../../src/core/server';
import { uptimeRuleFieldMap } from '../common/rules/uptime_rule_field_map';
import { initServerWithKibana } from './kibana.index';
import {
  KibanaTelemetryAdapter,
  UptimeCorePluginsSetup,
  UptimeCorePluginsStart,
  UptimeCoreSetup,
} from './lib/adapters';
import { registerUptimeSavedObjects, savedObjectsAdapter } from './lib/saved_objects/saved_objects';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { Dataset } from '../../rule_registry/server';
import { UptimeConfig } from '../common/config';
import { installSyntheticsIndexTemplates } from './rest_api/synthetics_service/install_index_templates';

export type UptimeRuleRegistry = ReturnType<Plugin['setup']>['ruleRegistry'];

export class Plugin implements PluginType {
  private savedObjectsClient?: ISavedObjectsRepository;
  private initContext: PluginInitializerContext;
  private logger: Logger;
  private server?: UptimeCoreSetup;

  constructor(initializerContext: PluginInitializerContext<UptimeConfig>) {
    this.initContext = initializerContext;
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: UptimeCorePluginsSetup) {
    const config = this.initContext.config.get<UptimeConfig>();

    savedObjectsAdapter.config = config;

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

    this.server = {
      config,
      router: core.http.createRouter(),
      cloud: plugins.cloud,
    } as UptimeCoreSetup;

    initServerWithKibana(this.server, plugins, ruleDataClient, this.logger);

    registerUptimeSavedObjects(core.savedObjects, plugins.encryptedSavedObjects, config);

    KibanaTelemetryAdapter.registerUsageCollector(
      plugins.usageCollection,
      () => this.savedObjectsClient
    );

    return {
      ruleRegistry: ruleDataClient,
    };
  }

  public start(core: CoreStart, plugins: UptimeCorePluginsStart) {
    this.savedObjectsClient = core.savedObjects.createInternalRepository();
    if (this.server) {
      this.server.security = plugins.security;
      this.server.fleet = plugins.fleet;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
    }

    if (this.server?.config?.unsafe?.service.enabled) {
      const esClient = core.elasticsearch.client.asInternalUser;
      installSyntheticsIndexTemplates({
        esClient,
        server: this.server,
        savedObjectsClient: new SavedObjectsClient(core.savedObjects.createInternalRepository()),
      }).then(
        (result) => {
          if (result.name === 'synthetics' && result.install_status === 'installed') {
            this.logger.info('Installed synthetics index templates');
          } else if (result.name === 'synthetics' && result.install_status === 'install_failed') {
            this.logger.warn('Failed to install synthetics index templates');
          }
        },
        () => {
          this.logger.warn('Failed to install synthetics index templates');
        }
      );
    }
  }

  public stop() {}
}
