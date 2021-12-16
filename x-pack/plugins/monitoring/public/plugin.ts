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
} from 'kibana/public';
import { Legacy } from './legacy_shims';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { MonitoringStartPluginDependencies, MonitoringConfig } from './types';
import { TriggersAndActionsUIPublicPluginSetup } from '../../triggers_actions_ui/public';
import {
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
  RULE_DETAILS,
} from '../common/constants';
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

  public async setup(
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

    if (!monitoring.ui.enabled || !monitoring.enabled) {
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
        category: FeatureCatalogueCategory.ADMIN,
        description: i18n.translate('xpack.monitoring.featureCatalogueDescription', {
          defaultMessage: 'Track the real-time health and performance of your deployment.',
        }),
        order: 610,
      });
    }

    await this.registerAlerts(plugins, monitoring);

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

  private async registerAlerts(
    plugins: MonitoringSetupPluginDependencies,
    config: MonitoringConfig
  ) {
    const {
      triggersActionsUi: { ruleTypeRegistry },
    } = plugins;

    const { createCpuUsageAlertType } = await import('./alerts/cpu_usage_alert');
    const { createMissingMonitoringDataAlertType } = await import(
      './alerts/missing_monitoring_data_alert'
    );
    const { createLegacyAlertTypes } = await import('./alerts/legacy_alert');
    const { createDiskUsageAlertType } = await import('./alerts/disk_usage_alert');
    const { createThreadPoolRejectionsAlertType } = await import(
      './alerts/thread_pool_rejections_alert'
    );
    const { createMemoryUsageAlertType } = await import('./alerts/memory_usage_alert');
    const { createCCRReadExceptionsAlertType } = await import('./alerts/ccr_read_exceptions_alert');
    const { createLargeShardSizeAlertType } = await import('./alerts/large_shard_size_alert');

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
