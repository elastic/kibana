import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
  Plugin as PluginType,
  SavedObjectsClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { uptimeFeature } from './feature';
import { initSyntheticsServer } from './server';
import { SyntheticsMonitorClient } from './synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { TelemetryEventsSender } from './telemetry/sender';
import {
  SyntheticsPluginsSetupDependencies,
  SyntheticsPluginsStartDependencies,
  SyntheticsServerSetup,
} from './types';

import { UptimeConfig } from '../common/config';
import { SYNTHETICS_RULE_TYPES_ALERT_CONTEXT } from '../common/constants/synthetics_alerts';
import { uptimeRuleTypeFieldMap } from './alert_rules/common';
import { registerUptimeSavedObjects, savedObjectsAdapter } from './saved_objects/saved_objects';
import { syntheticsServiceApiKey } from './saved_objects/service_api_key';
import { SyntheticsService } from './synthetics_service/synthetics_service';

export class Plugin implements PluginType {
  private savedObjectsClient?: SavedObjectsClientContract;
  private readonly logger: Logger;
  private server?: SyntheticsServerSetup;
  private syntheticsService?: SyntheticsService;
  private syntheticsMonitorClient?: SyntheticsMonitorClient;
  private readonly telemetryEventsSender: TelemetryEventsSender;

  constructor(private readonly initContext: PluginInitializerContext<UptimeConfig>) {
    this.logger = initContext.logger.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
  }

  public setup(core: CoreSetup, plugins: SyntheticsPluginsSetupDependencies) {
    const config = this.initContext.config.get<UptimeConfig>();

    savedObjectsAdapter.config = config;

    const { ruleDataService } = plugins.ruleRegistry;

    const ruleDataClient = ruleDataService.initializeIndex({
      feature: 'uptime',
      registrationContext: SYNTHETICS_RULE_TYPES_ALERT_CONTEXT,
      dataset: Dataset.alerts,
      componentTemplateRefs: [],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(uptimeRuleTypeFieldMap, 'strict'),
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
      share: plugins.share,
    } as SyntheticsServerSetup;

    this.syntheticsService = new SyntheticsService(this.server);

    this.syntheticsService.setup(plugins.taskManager).catch(() => {});

    this.syntheticsMonitorClient = new SyntheticsMonitorClient(this.syntheticsService, this.server);

    this.telemetryEventsSender.setup(plugins.telemetry);

    plugins.features.registerKibanaFeature(uptimeFeature);

    initSyntheticsServer(this.server, this.syntheticsMonitorClient, plugins, ruleDataClient);

    registerUptimeSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    return {};
  }

  public start(coreStart: CoreStart, pluginsStart: SyntheticsPluginsStartDependencies) {
    this.savedObjectsClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository([syntheticsServiceApiKey.name])
    );

    if (this.server) {
      this.server.coreStart = coreStart;
      this.server.pluginsStart = pluginsStart;
      this.server.security = pluginsStart.security;
      this.server.fleet = pluginsStart.fleet;
      this.server.encryptedSavedObjects = pluginsStart.encryptedSavedObjects;
      this.server.savedObjectsClient = this.savedObjectsClient;
      this.server.spaces = pluginsStart.spaces;
      this.server.isElasticsearchServerless = coreStart.elasticsearch.getCapabilities().serverless;
    }

    this.syntheticsService?.start(pluginsStart.taskManager);

    this.telemetryEventsSender.start(pluginsStart.telemetry, coreStart).catch(() => {});
  }

  public stop() {}
}
