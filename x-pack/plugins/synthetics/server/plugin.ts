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
} from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/rule-registry-plugin/common/mapping_from_field_map';
import { experimentalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/experimental_rule_field_map';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { SyntheticsMonitorClient } from './synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { initSyntheticsServer } from './server';
import { initUptimeServer } from './legacy_uptime/uptime_server';
import { uptimeFeature } from './feature';
import { uptimeRuleFieldMap } from '../common/rules/uptime_rule_field_map';
import {
  KibanaTelemetryAdapter,
  UptimeCorePluginsSetup,
  UptimeCorePluginsStart,
  UptimeServerSetup,
} from './legacy_uptime/lib/adapters';
import { TelemetryEventsSender } from './legacy_uptime/lib/telemetry/sender';
import {
  registerUptimeSavedObjects,
  savedObjectsAdapter,
} from './legacy_uptime/lib/saved_objects/saved_objects';
import { UptimeConfig } from '../common/config';
import { SyntheticsService } from './synthetics_service/synthetics_service';
import { syntheticsServiceApiKey } from './legacy_uptime/lib/saved_objects/service_api_key';

export type UptimeRuleRegistry = ReturnType<Plugin['setup']>['ruleRegistry'];

export class Plugin implements PluginType {
  private savedObjectsClient?: SavedObjectsClientContract;
  private initContext: PluginInitializerContext;
  private logger: Logger;
  private server?: UptimeServerSetup;
  private syntheticsService?: SyntheticsService;
  private syntheticsMonitorClient?: SyntheticsMonitorClient;
  private readonly telemetryEventsSender: TelemetryEventsSender;

  constructor(initializerContext: PluginInitializerContext<UptimeConfig>) {
    this.initContext = initializerContext;
    this.logger = initializerContext.logger.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
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
      stackVersion: this.initContext.env.packageInfo.version,
      basePath: core.http.basePath,
      logger: this.logger,
      telemetry: this.telemetryEventsSender,
      isDev: this.initContext.env.mode.dev,
      spaces: plugins.spaces,
    } as UptimeServerSetup;

    this.syntheticsService = new SyntheticsService(this.server);

    this.syntheticsService.setup(plugins.taskManager);

    this.syntheticsMonitorClient = new SyntheticsMonitorClient(this.syntheticsService, this.server);

    this.telemetryEventsSender.setup(plugins.telemetry);

    plugins.features.registerKibanaFeature(uptimeFeature);

    initUptimeServer(this.server, plugins, ruleDataClient, this.logger);

    initSyntheticsServer(this.server, this.syntheticsMonitorClient, plugins, ruleDataClient);

    registerUptimeSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    KibanaTelemetryAdapter.registerUsageCollector(
      plugins.usageCollection,
      () => this.savedObjectsClient
    );

    return {
      ruleRegistry: ruleDataClient,
    };
  }

  public start(coreStart: CoreStart, pluginsStart: UptimeCorePluginsStart) {
    this.savedObjectsClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository([syntheticsServiceApiKey.name])
    );

    if (this.server) {
      this.server.coreStart = coreStart;
      this.server.security = pluginsStart.security;
      this.server.fleet = pluginsStart.fleet;
      this.server.encryptedSavedObjects = pluginsStart.encryptedSavedObjects;
      this.server.savedObjectsClient = this.savedObjectsClient;
    }

    this.syntheticsService?.start(pluginsStart.taskManager);

    this.telemetryEventsSender.start(pluginsStart.telemetry, coreStart);
  }

  public stop() {}
}
