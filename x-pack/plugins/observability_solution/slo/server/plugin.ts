/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  Logger,
  SavedObjectsClient,
} from '@kbn/core/server';
import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { AlertsLocatorDefinition } from '@kbn/observability-plugin/common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { registerSloUsageCollector } from './lib/collectors/register';
import { SloOrphanSummaryCleanupTask } from './services/tasks/orphan_summary_cleanup_task';
import { slo, SO_SLO_TYPE } from './saved_objects';
import { DefaultResourceInstaller, DefaultSLOInstaller } from './services';
import { registerBurnRateRule } from './lib/rules/register_burn_rate_rule';
import { SloConfig } from '.';
import { registerRoutes } from './routes/register_routes';
import { getSloServerRouteRepository } from './routes/get_slo_server_route_repository';
import { sloSettings, SO_SLO_SETTINGS_TYPE } from './saved_objects/slo_settings';

export type SloPluginSetup = ReturnType<SloPlugin['setup']>;

export interface PluginSetup {
  alerting: AlertingServerSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  share: SharePluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  spaces?: SpacesPluginSetup;
  cloud?: CloudSetup;
  usageCollection: UsageCollectionSetup;
}

export interface PluginStart {
  alerting: AlertingServerStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  dataViews: DataViewsServerPluginStart;
}

const sloRuleTypes = [SLO_BURN_RATE_RULE_TYPE_ID];

export class SloPlugin implements Plugin<SloPluginSetup> {
  private readonly logger: Logger;
  private sloOrphanCleanupTask?: SloOrphanSummaryCleanupTask;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<PluginStart>, plugins: PluginSetup) {
    const config = this.initContext.config.get<SloConfig>();
    const alertsLocator = plugins.share.url.locators.create(new AlertsLocatorDefinition());

    const savedObjectTypes = [SO_SLO_TYPE, SO_SLO_SETTINGS_TYPE];

    const alertingFeatures = sloRuleTypes.map((ruleTypeId) => ({
      ruleTypeId,
      consumers: [sloFeatureId, ALERTING_FEATURE_ID],
    }));

    plugins.features.registerKibanaFeature({
      id: sloFeatureId,
      name: i18n.translate('xpack.slo.featureRegistry.linkSloTitle', {
        defaultMessage: 'SLOs',
      }),
      order: 1200,
      category: DEFAULT_APP_CATEGORIES.observability,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: [sloFeatureId, 'kibana'],
      catalogue: [sloFeatureId, 'observability'],
      alerting: alertingFeatures,
      privileges: {
        all: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_write', 'slo_read', 'rac'],
          savedObject: {
            all: savedObjectTypes,
            read: [],
          },
          alerting: {
            rule: {
              all: alertingFeatures,
            },
            alert: {
              all: alertingFeatures,
            },
          },
          ui: ['read', 'write'],
        },
        read: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_read', 'rac'],
          savedObject: {
            all: [],
            read: savedObjectTypes,
          },
          alerting: {
            rule: {
              read: alertingFeatures,
            },
            alert: {
              read: alertingFeatures,
            },
          },
          ui: ['read'],
        },
      },
    });

    const { ruleDataService } = plugins.ruleRegistry;

    core.savedObjects.registerType(slo);
    core.savedObjects.registerType(sloSettings);

    registerBurnRateRule(plugins.alerting, core.http.basePath, this.logger, ruleDataService, {
      alertsLocator,
    });

    registerSloUsageCollector(plugins.usageCollection);

    registerRoutes({
      core,
      config,
      dependencies: {
        pluginsSetup: {
          ...plugins,
          core,
        },
        getDataViewsStart: async () => {
          const [, pluginStart] = await core.getStartServices();
          return pluginStart.dataViews;
        },
        getSpacesStart: async () => {
          const [, pluginStart] = await core.getStartServices();
          return pluginStart.spaces;
        },
        ruleDataService,
        getRulesClientWithRequest: async (request) => {
          const [, pluginStart] = await core.getStartServices();
          return pluginStart.alerting.getRulesClientWithRequest(request);
        },
        getRacClientWithRequest: async (request) => {
          const [, pluginStart] = await core.getStartServices();
          return pluginStart.ruleRegistry.getRacClientWithRequest(request);
        },
      },
      logger: this.logger,
      repository: getSloServerRouteRepository({
        isServerless: this.initContext.env.packageInfo.buildFlavor === 'serverless',
      }),
    });

    core
      .getStartServices()
      .then(async ([coreStart, pluginStart]) => {
        const esInternalClient = coreStart.elasticsearch.client.asInternalUser;
        const sloResourceInstaller = new DefaultResourceInstaller(esInternalClient, this.logger);
        const sloInstaller = new DefaultSLOInstaller(sloResourceInstaller, this.logger);
        await sloInstaller.install();
      })
      .catch((error) => {
        this.logger.error(`Failed to install the default SLOs: ${error}`);
      });

    this.sloOrphanCleanupTask = new SloOrphanSummaryCleanupTask(
      plugins.taskManager,
      this.logger,
      config
    );
  }

  public start(core: CoreStart, plugins: PluginStart) {
    const internalSoClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());
    const internalEsClient = core.elasticsearch.client.asInternalUser;

    this.sloOrphanCleanupTask
      ?.start(plugins.taskManager, internalSoClient, internalEsClient)
      .catch(() => {});
  }

  public stop() {}
}
