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
} from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { initUptimeServer } from './legacy_uptime/uptime_server';
import {
  UptimeCorePluginsSetup,
  UptimeCorePluginsStart,
  UptimeServerSetup,
} from './legacy_uptime/lib/adapters';
import {
  registerUptimeSavedObjects,
  savedObjectsAdapter,
} from './legacy_uptime/lib/saved_objects/saved_objects';
import { UptimeConfig } from '../common/config';
import { SYNTHETICS_RULE_TYPES_ALERT_CONTEXT } from '../common/constants/synthetics_alerts';
import { uptimeRuleTypeFieldMap } from './legacy_uptime/lib/alerts/common';

export class Plugin implements PluginType {
  private initContext: PluginInitializerContext;
  private logger: Logger;
  private server?: UptimeServerSetup;

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
      basePath: core.http.basePath,
      isDev: this.initContext.env.mode.dev,
      share: plugins.share,
    };

    initUptimeServer(this.server, plugins, ruleDataClient, this.logger, core.http.createRouter());

    registerUptimeSavedObjects(core.savedObjects);

    return {
      ruleRegistry: ruleDataClient,
    };
  }

  public start(coreStart: CoreStart, pluginsStart: UptimeCorePluginsStart) {}

  public stop() {}
}
