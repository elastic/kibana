/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SslConfig } from '@kbn/server-http-tools';

import path from 'path';
import {
  PluginInitializerContext,
  CoreStart,
  CoreSetup,
  Plugin as PluginType,
  Logger,
  SavedObjectsClient,
  SavedObjectsClientContract,
} from '../../../../src/core/server';
import { uptimeRuleFieldMap } from '../common/rules/uptime_rule_field_map';
import { initServerWithKibana } from './kibana.index';
import {
  KibanaTelemetryAdapter,
  UptimeCorePluginsSetup,
  UptimeCorePluginsStart,
  UptimeServerSetup,
} from './lib/adapters';
import { registerUptimeSavedObjects, savedObjectsAdapter } from './lib/saved_objects/saved_objects';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { experimentalRuleFieldMap } from '../../rule_registry/common/assets/field_maps/experimental_rule_field_map';
import { Dataset } from '../../rule_registry/server';
import { UptimeConfig } from '../common/config';
import { SyntheticsService } from './lib/synthetics_service/synthetics_service';
import { syntheticsServiceApiKey } from './lib/saved_objects/service_api_key';

export type UptimeRuleRegistry = ReturnType<Plugin['setup']>['ruleRegistry'];

export class Plugin implements PluginType {
  private savedObjectsClient?: SavedObjectsClientContract;
  private initContext: PluginInitializerContext;
  private logger: Logger;
  private server?: UptimeServerSetup;
  private syntheticService?: SyntheticsService;

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
          mappings: mappingFromFieldMap(
            { ...uptimeRuleFieldMap, ...experimentalRuleFieldMap },
            'strict'
          ),
        },
      ],
    });

    this.server = {
      config,
      router: core.http.createRouter(),
      cloud: plugins.cloud,
    } as UptimeServerSetup;

    if (this.server?.config?.unsafe?.service.enabled) {
      this.syntheticService = new SyntheticsService(this.logger, this.server);
      this.syntheticService.registerSyncTask(plugins.taskManager);
    }

    initServerWithKibana(this.server, plugins, ruleDataClient, this.logger);

    registerUptimeSavedObjects(core.savedObjects, plugins.encryptedSavedObjects, config);

    KibanaTelemetryAdapter.registerUsageCollector(
      plugins.usageCollection,
      () => this.savedObjectsClient
    );

    try {
      this.logger.info('with path');

      const tlsConfig = new SslConfig({
        key: path.join(__filename, config?.unsafe?.service?.tls.key),
        certificate: path.join(__filename, config?.unsafe?.service?.tls.certificate),
      } as any);
      this.logger.info(tlsConfig.key!);
      this.logger.info(tlsConfig.certificate!);
      this.server.pathTls = tlsConfig;
    } catch (e) {
      this.logger.error(e);
    }

    try {
      this.logger.info('without path');

      const tlsConfig1 = new SslConfig(config?.unsafe?.service?.tls);

      this.logger.info(tlsConfig1.key!);
      this.logger.info(tlsConfig1.certificate!);
      this.server.withoutPathTls = tlsConfig1;
    } catch (e) {
      this.logger.error(e);
    }

    return {
      ruleRegistry: ruleDataClient,
    };
  }

  public start(coreStart: CoreStart, plugins: UptimeCorePluginsStart) {
    if (this.server?.config?.unsafe?.service.enabled) {
      this.savedObjectsClient = new SavedObjectsClient(
        coreStart.savedObjects.createInternalRepository([syntheticsServiceApiKey.name])
      );
    } else {
      this.savedObjectsClient = new SavedObjectsClient(
        coreStart.savedObjects.createInternalRepository()
      );
    }

    if (this.server) {
      this.server.security = plugins.security;
      this.server.fleet = plugins.fleet;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.savedObjectsClient = this.savedObjectsClient;
    }

    if (this.server?.config?.unsafe?.service.enabled) {
      this.syntheticService?.init(coreStart);
      this.syntheticService?.scheduleSyncTask(plugins.taskManager);
      if (this.server && this.syntheticService) {
        this.server.syntheticsService = this.syntheticService;
      }
    }
  }

  public stop() {}
}
