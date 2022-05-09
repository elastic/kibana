/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  App,
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import {
  RULE_DETAILS,
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
} from '../common/constants';
import { createCCRReadExceptionsAlertType } from './alerts/ccr_read_exceptions_alert';
import { createCpuUsageAlertType } from './alerts/cpu_usage_alert';
import { createDiskUsageAlertType } from './alerts/disk_usage_alert';
import { createLargeShardSizeAlertType } from './alerts/large_shard_size_alert';
import { createLegacyAlertTypes } from './alerts/legacy_alert';
import { createMemoryUsageAlertType } from './alerts/memory_usage_alert';
import { createMissingMonitoringDataAlertType } from './alerts/missing_monitoring_data_alert';
import { createThreadPoolRejectionsAlertType } from './alerts/thread_pool_rejections_alert';
import { setConfig } from './external_config';
import { Legacy } from './legacy_shims';
import {
  MonitoringConfig,
  MonitoringStartPluginDependencies,
  LegacyMonitoringStartPluginDependencies,
} from './types';

interface MonitoringSetupPluginDependencies {
  home?: HomePublicPluginSetup;
  cloud?: { isCloudEnabled: boolean };
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export class MonitoringPlugin
  implements
    Plugin<void, void, MonitoringSetupPluginDependencies, MonitoringStartPluginDependencies>
{
  constructor(private initializerContext: PluginInitializerContext<MonitoringConfig>) {}

  public setup(
    core: CoreSetup<MonitoringStartPluginDependencies>,
    plugins: MonitoringSetupPluginDependencies
  ) {
    const { home } = plugins;
    const id = 'monitoring';
    const icon = 'monitoringApp';
    const title = i18n.translate('xpack.monitoring.stackMonitoringTitle', {
      defaultMessage: 'Stack Monitoring',
    });
    const monitoring = this.initializerContext.config.get();

    if (!monitoring.ui.enabled) {
      return false;
    }

    if (home) {
      home.featureCatalogue.register({
        id,
        title: i18n.translate('xpack.monitoring.featureCatalogueTitle', {
          defaultMessage: 'Monitor the stack',
        }),
        icon,
        path: '/app/monitoring',
        showOnHomePage: true,
        category: 'admin',
        description: i18n.translate('xpack.monitoring.featureCatalogueDescription', {
          defaultMessage: 'Track the real-time health and performance of your deployment.',
        }),
        order: 610,
      });
    }

    this.registerAlerts(plugins, monitoring);

    const app: App = {
      id,
      title,
      order: 9030,
      euiIconType: icon,
      category: DEFAULT_APP_CATEGORIES.management,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const externalConfig = this.getExternalConfig();
        const deps: LegacyMonitoringStartPluginDependencies = {
          navigation: pluginsStart.navigation,
          element: params.element,
          core: coreStart,
          data: pluginsStart.data,
          isCloud: Boolean(plugins.cloud?.isCloudEnabled),
          pluginInitializerContext: this.initializerContext,
          externalConfig,
          triggersActionsUi: pluginsStart.triggersActionsUi,
          usageCollection: plugins.usageCollection,
          appMountParameters: params,
          dataViews: pluginsStart.dataViews,
        };

        Legacy.init({
          core: deps.core,
          element: deps.element,
          data: deps.data,
          navigation: deps.navigation,
          isCloud: deps.isCloud,
          pluginInitializerContext: deps.pluginInitializerContext,
          externalConfig: deps.externalConfig,
          triggersActionsUi: deps.triggersActionsUi,
          usageCollection: deps.usageCollection,
          appMountParameters: deps.appMountParameters,
          dataViews: deps.dataViews,
        });

        const config = Object.fromEntries(externalConfig);
        setConfig(config);
        const { renderApp } = await import('./application');
        return renderApp(coreStart, pluginsStart, params, config);
      },
    };

    core.application.register(app);
  }

  public start(core: CoreStart, plugins: any) {}

  public stop() {}

  private getExternalConfig() {
    const monitoring = this.initializerContext.config.get();
    return [
      ['minIntervalSeconds', monitoring.ui.min_interval_seconds],
      ['showLicenseExpiration', monitoring.ui.show_license_expiration],
      ['showCgroupMetricsElasticsearch', monitoring.ui.container.elasticsearch.enabled],
      ['showCgroupMetricsLogstash', monitoring.ui.container.logstash.enabled],
    ];
  }

  private registerAlerts(plugins: MonitoringSetupPluginDependencies, config: MonitoringConfig) {
    const {
      triggersActionsUi: { ruleTypeRegistry },
    } = plugins;

    ruleTypeRegistry.register(createCpuUsageAlertType(config));
    ruleTypeRegistry.register(createDiskUsageAlertType(config));
    ruleTypeRegistry.register(createMemoryUsageAlertType(config));
    ruleTypeRegistry.register(createMissingMonitoringDataAlertType());
    ruleTypeRegistry.register(
      createThreadPoolRejectionsAlertType(
        RULE_THREAD_POOL_SEARCH_REJECTIONS,
        RULE_DETAILS[RULE_THREAD_POOL_SEARCH_REJECTIONS],
        config
      )
    );
    ruleTypeRegistry.register(
      createThreadPoolRejectionsAlertType(
        RULE_THREAD_POOL_WRITE_REJECTIONS,
        RULE_DETAILS[RULE_THREAD_POOL_WRITE_REJECTIONS],
        config
      )
    );
    ruleTypeRegistry.register(createCCRReadExceptionsAlertType(config));
    ruleTypeRegistry.register(createLargeShardSizeAlertType(config));
    const legacyAlertTypes = createLegacyAlertTypes(config);
    for (const legacyAlertType of legacyAlertTypes) {
      ruleTypeRegistry.register(legacyAlertType);
    }
  }
}
