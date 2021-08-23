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
import { createCpuUsageAlertType } from './alerts/cpu_usage_alert';
import { createMissingMonitoringDataAlertType } from './alerts/missing_monitoring_data_alert';
import { createLegacyAlertTypes } from './alerts/legacy_alert';
import { createDiskUsageAlertType } from './alerts/disk_usage_alert';
import { createThreadPoolRejectionsAlertType } from './alerts/thread_pool_rejections_alert';
import { createMemoryUsageAlertType } from './alerts/memory_usage_alert';
import { createCCRReadExceptionsAlertType } from './alerts/ccr_read_exceptions_alert';
import { createLargeShardSizeAlertType } from './alerts/large_shard_size_alert';

interface MonitoringSetupPluginDependencies {
  home?: HomePublicPluginSetup;
  cloud?: { isCloudEnabled: boolean };
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}

const HASH_CHANGE = 'hashchange';

export class MonitoringPlugin
  implements
    Plugin<boolean, void, MonitoringSetupPluginDependencies, MonitoringStartPluginDependencies> {
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

    this.registerAlerts(plugins);

    const app: App = {
      id,
      title,
      order: 9030,
      euiIconType: icon,
      category: DEFAULT_APP_CATEGORIES.management,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { AngularApp } = await import('./angular');
        const externalConfig = this.getExternalConfig();
        const deps: MonitoringStartPluginDependencies = {
          navigation: pluginsStart.navigation,
          kibanaLegacy: pluginsStart.kibanaLegacy,
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

        const config = Object.fromEntries(externalConfig);
        if (config.renderReactApp) {
          const { renderApp } = await import('./application');
          return renderApp(coreStart, pluginsStart, params);
        } else {
          const monitoringApp = new AngularApp(deps);
          const removeHistoryListener = params.history.listen((location) => {
            if (location.pathname === '' && location.hash === '') {
              monitoringApp.applyScope();
            }
          });

          const removeHashChange = this.setInitialTimefilter(deps);
          return () => {
            if (removeHashChange) {
              removeHashChange();
            }
            removeHistoryListener();
            monitoringApp.destroy();
          };
        }
      },
    };

    core.application.register(app);
    return true;
  }

  public start(core: CoreStart, plugins: any) {}

  public stop() {}

  private setInitialTimefilter({ data }: MonitoringStartPluginDependencies) {
    const { timefilter } = data.query.timefilter;
    const { pause: pauseByDefault } = timefilter.getRefreshIntervalDefaults();
    if (pauseByDefault) {
      return;
    }
    /**
     * We can't use timefilter.getRefreshIntervalUpdate$ last value,
     * since it's not a BehaviorSubject. This means we need to wait for
     * hash change because of angular's applyAsync
     */
    const onHashChange = () => {
      const { value, pause } = timefilter.getRefreshInterval();
      if (!value && pause) {
        window.removeEventListener(HASH_CHANGE, onHashChange);
        timefilter.setRefreshInterval({ value: 10000, pause: false });
      }
    };
    window.addEventListener(HASH_CHANGE, onHashChange, false);
    return () => window.removeEventListener(HASH_CHANGE, onHashChange);
  }

  private getExternalConfig() {
    const monitoring = this.initializerContext.config.get();
    return [
      ['minIntervalSeconds', monitoring.ui.min_interval_seconds],
      ['showLicenseExpiration', monitoring.ui.show_license_expiration],
      ['showCgroupMetricsElasticsearch', monitoring.ui.container.elasticsearch.enabled],
      ['showCgroupMetricsLogstash', monitoring.ui.container.logstash.enabled],
      ['renderReactApp', monitoring.ui.render_react_app],
    ];
  }

  private registerAlerts(plugins: MonitoringSetupPluginDependencies) {
    const {
      triggersActionsUi: { ruleTypeRegistry },
    } = plugins;
    ruleTypeRegistry.register(createCpuUsageAlertType());
    ruleTypeRegistry.register(createDiskUsageAlertType());
    ruleTypeRegistry.register(createMemoryUsageAlertType());
    ruleTypeRegistry.register(createMissingMonitoringDataAlertType());
    ruleTypeRegistry.register(
      createThreadPoolRejectionsAlertType(
        RULE_THREAD_POOL_SEARCH_REJECTIONS,
        RULE_DETAILS[RULE_THREAD_POOL_SEARCH_REJECTIONS]
      )
    );
    ruleTypeRegistry.register(
      createThreadPoolRejectionsAlertType(
        RULE_THREAD_POOL_WRITE_REJECTIONS,
        RULE_DETAILS[RULE_THREAD_POOL_WRITE_REJECTIONS]
      )
    );
    ruleTypeRegistry.register(createCCRReadExceptionsAlertType());
    ruleTypeRegistry.register(createLargeShardSizeAlertType());
    const legacyAlertTypes = createLegacyAlertTypes();
    for (const legacyAlertType of legacyAlertTypes) {
      ruleTypeRegistry.register(legacyAlertType);
    }
  }
}
