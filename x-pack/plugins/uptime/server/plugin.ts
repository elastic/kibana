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
import { TelemetryEventsSender } from './lib/telemetry/sender';
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
  private readonly telemetryEventsSender: TelemetryEventsSender;
  private readonly isServiceEnabled?: boolean;

  constructor(initializerContext: PluginInitializerContext<UptimeConfig>) {
    this.initContext = initializerContext;
    this.logger = initializerContext.logger.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
    const config = this.initContext.config.get<UptimeConfig>();
    this.isServiceEnabled = config?.ui?.monitorManagement?.enabled && Boolean(config.service);
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
      kibanaVersion: this.initContext.env.packageInfo.version,
      logger: this.logger,
      telemetry: this.telemetryEventsSender,
    } as UptimeServerSetup;

    if (this.isServiceEnabled && this.server.config.service) {
      this.syntheticService = new SyntheticsService(
        this.logger,
        this.server,
        this.server.config.service
      );

      this.syntheticService.registerSyncTask(plugins.taskManager);
      this.telemetryEventsSender.setup(plugins.telemetry);
    }

    initServerWithKibana(this.server, plugins, ruleDataClient, this.logger);

    registerUptimeSavedObjects(
      core.savedObjects,
      plugins.encryptedSavedObjects,
      Boolean(this.isServiceEnabled)
    );

    KibanaTelemetryAdapter.registerUsageCollector(
      plugins.usageCollection,
      () => this.savedObjectsClient
    );

    return {
      ruleRegistry: ruleDataClient,
    };
  }

  public start(coreStart: CoreStart, plugins: UptimeCorePluginsStart) {
    if (this.isServiceEnabled) {
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

    if (this.isServiceEnabled) {
      this.syntheticService?.init();
      this.syntheticService?.scheduleSyncTask(plugins.taskManager);
      if (this.server && this.syntheticService) {
        this.server.syntheticsService = this.syntheticService;
      }
      this.telemetryEventsSender.start(plugins.telemetry, coreStart);
    }
  }

  public stop() {}
}
