/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type {
  DataPublicPluginStart,
  DataPublicPluginSetup,
} from '@kbn/data-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import type {
  PluginSetupContract as AlertingPluginPublicSetup,
  PluginStartContract as AlertingPluginPublicStart,
} from '@kbn/alerting-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import {
  FetchDataParams,
  METRIC_TYPE,
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { InfraClientStartExports } from '@kbn/infra-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { registerApmRuleTypes } from './components/alerting/rule_types/register_apm_rule_types';
import {
  getApmEnrollmentFlyoutData,
  LazyApmCustomAssetsExtension,
} from './components/fleet_integration';
import { getLazyApmAgentsTabExtension } from './components/fleet_integration/lazy_apm_agents_tab_extension';
import { getLazyAPMPolicyCreateExtension } from './components/fleet_integration/lazy_apm_policy_create_extension';
import { getLazyAPMPolicyEditExtension } from './components/fleet_integration/lazy_apm_policy_edit_extension';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import type { ConfigSchema } from '.';
import { APMServiceDetailLocator } from './locator/service_detail_locator';

export type ApmPluginSetup = ReturnType<ApmPlugin['setup']>;

export type ApmPluginStart = void;

export interface ApmPluginSetupDeps {
  alerting?: AlertingPluginPublicSetup;
  data: DataPublicPluginSetup;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  features: FeaturesPluginSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  ml?: MlPluginSetup;
  observability: ObservabilityPublicSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  share: SharePluginSetup;
}

export interface ApmPluginStartDeps {
  alerting?: AlertingPluginPublicStart;
  charts?: ChartsPluginStart;
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  home: void;
  inspector: InspectorPluginStart;
  licensing: void;
  maps?: MapsStartApi;
  ml?: MlPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  observability: ObservabilityPublicStart;
  fleet?: FleetStart;
  fieldFormats?: FieldFormatsStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  infra?: InfraClientStartExports;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  storage: IStorageWrapper;
  lens: LensPublicStart;
}

const servicesTitle = i18n.translate('xpack.apm.navigation.servicesTitle', {
  defaultMessage: 'Services',
});

const serviceGroupsTitle = i18n.translate(
  'xpack.apm.navigation.serviceGroupsTitle',
  {
    defaultMessage: 'Service groups',
  }
);

const tracesTitle = i18n.translate('xpack.apm.navigation.tracesTitle', {
  defaultMessage: 'Traces',
});
const serviceMapTitle = i18n.translate('xpack.apm.navigation.serviceMapTitle', {
  defaultMessage: 'Service Map',
});

const dependenciesTitle = i18n.translate(
  'xpack.apm.navigation.dependenciesTitle',
  {
    defaultMessage: 'Dependencies',
  }
);

const apmSettingsTitle = i18n.translate(
  'xpack.apm.navigation.apmSettingsTitle',
  {
    defaultMessage: 'Settings',
  }
);

const apmStorageExplorerTitle = i18n.translate(
  'xpack.apm.navigation.apmStorageExplorerTitle',
  {
    defaultMessage: 'Storage Explorer',
  }
);

export class ApmPlugin implements Plugin<ApmPluginSetup, ApmPluginStart> {
  constructor(
    private readonly initializerContext: PluginInitializerContext<ConfigSchema>
  ) {
    this.initializerContext = initializerContext;
  }
  public setup(core: CoreSetup, plugins: ApmPluginSetupDeps) {
    const config = this.initializerContext.config.get();
    const pluginSetupDeps = plugins;

    if (pluginSetupDeps.home) {
      pluginSetupDeps.home.environment.update({ apmUi: true });
      pluginSetupDeps.home.featureCatalogue.register(featureCatalogueEntry);
    }

    // register observability nav if user has access to plugin
    plugins.observability.navigation.registerSections(
      from(core.getStartServices()).pipe(
        map(([coreStart, pluginsStart]) => {
          if (coreStart.application.capabilities.apm.show) {
            return [
              // APM navigation
              {
                label: 'APM',
                sortKey: 400,
                entries: [
                  {
                    label: servicesTitle,
                    app: 'apm',
                    path: '/services',
                    matchPath(currentPath: string) {
                      return [
                        '/service-groups',
                        '/services',
                        '/service-map',
                      ].some((testPath) => currentPath.startsWith(testPath));
                    },
                  },
                  { label: tracesTitle, app: 'apm', path: '/traces' },
                  {
                    label: dependenciesTitle,
                    app: 'apm',
                    path: '/dependencies/inventory',
                    onClick: () => {
                      const { usageCollection } = pluginsStart as {
                        usageCollection?: UsageCollectionStart;
                      };

                      if (usageCollection) {
                        usageCollection.reportUiCounter(
                          'apm',
                          METRIC_TYPE.CLICK,
                          'side_nav_dependency'
                        );
                      }
                    },
                  },
                ],
              },
            ];
          }

          return [];
        })
      )
    );

    const getApmDataHelper = async () => {
      const { fetchObservabilityOverviewPageData, getHasData } = await import(
        './services/rest/apm_observability_overview_fetchers'
      );
      const { hasFleetApmIntegrations } = await import(
        './tutorial/tutorial_apm_fleet_check'
      );

      const { createCallApmApi } = await import(
        './services/rest/create_call_apm_api'
      );

      // have to do this here as well in case app isn't mounted yet
      createCallApmApi(core);

      return {
        fetchObservabilityOverviewPageData,
        getHasData,
        hasFleetApmIntegrations,
      };
    };

    // Registers a status check callback for the tutorial to call and verify if the APM integration is installed on fleet.
    pluginSetupDeps.home?.tutorials.registerCustomStatusCheck(
      'apm_fleet_server_status_check',
      async () => {
        const { hasFleetApmIntegrations } = await getApmDataHelper();
        return hasFleetApmIntegrations();
      }
    );

    // Registers custom component that is going to be render on fleet section
    pluginSetupDeps.home?.tutorials.registerCustomComponent(
      'TutorialFleetInstructions',
      () => import('./tutorial/tutorial_fleet_instructions')
    );

    pluginSetupDeps.home?.tutorials.registerCustomComponent(
      'TutorialConfigAgent',
      () => import('./tutorial/config_agent')
    );

    pluginSetupDeps.home?.tutorials.registerCustomComponent(
      'TutorialConfigAgentRumScript',
      () => import('./tutorial/config_agent/rum_script')
    );

    plugins.observability.dashboard.register({
      appName: 'apm',
      hasData: async () => {
        const dataHelper = await getApmDataHelper();
        return await dataHelper.getHasData();
      },
      fetchData: async (params: FetchDataParams) => {
        const dataHelper = await getApmDataHelper();
        return await dataHelper.fetchObservabilityOverviewPageData(params);
      },
    });

    const { observabilityRuleTypeRegistry } = plugins.observability;

    core.application.register({
      id: 'apm',
      title: 'APM',
      order: 8300,
      euiIconType: 'logoObservability',
      appRoute: '/app/apm',
      icon: 'plugins/apm/public/icon.svg',
      category: DEFAULT_APP_CATEGORIES.observability,
      deepLinks: [
        {
          id: 'service-groups-list',
          title: serviceGroupsTitle,
          path: '/service-groups',
        },
        {
          id: 'services',
          title: servicesTitle,
          path: '/services',
        },
        { id: 'traces', title: tracesTitle, path: '/traces' },
        { id: 'service-map', title: serviceMapTitle, path: '/service-map' },
        {
          id: 'dependencies',
          title: dependenciesTitle,
          path: '/dependencies/inventory',
        },
        { id: 'settings', title: apmSettingsTitle, path: '/settings' },
        {
          id: 'storage-explorer',
          title: apmStorageExplorerTitle,
          path: '/storage-explorer',
        },
      ],

      async mount(appMountParameters: AppMountParameters<unknown>) {
        // Load application bundle and Get start services
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        return renderApp({
          coreStart,
          pluginsSetup: pluginSetupDeps,
          appMountParameters,
          config,
          pluginsStart: pluginsStart as ApmPluginStartDeps,
          observabilityRuleTypeRegistry,
        });
      },
    });

    registerApmRuleTypes(observabilityRuleTypeRegistry);

    const locator = plugins.share.url.locators.create(
      new APMServiceDetailLocator(core.uiSettings)
    );

    return {
      locator,
    };
  }
  public start(core: CoreStart, plugins: ApmPluginStartDeps) {
    const { fleet } = plugins;
    if (fleet) {
      const agentEnrollmentExtensionData = getApmEnrollmentFlyoutData();

      fleet.registerExtension({
        package: 'apm',
        view: 'agent-enrollment-flyout',
        title: agentEnrollmentExtensionData.title,
        Component: agentEnrollmentExtensionData.Component,
      });

      fleet.registerExtension({
        package: 'apm',
        view: 'package-detail-assets',
        Component: LazyApmCustomAssetsExtension,
      });

      fleet.registerExtension({
        package: 'apm',
        view: 'package-policy-create',
        Component: getLazyAPMPolicyCreateExtension(),
      });

      fleet.registerExtension({
        package: 'apm',
        view: 'package-policy-edit',
        useLatestPackageVersion: true,
        Component: getLazyAPMPolicyEditExtension(),
      });

      fleet.registerExtension({
        package: 'apm',
        view: 'package-policy-edit-tabs',
        tabs: [
          { title: 'APM Agents', Component: getLazyApmAgentsTabExtension() },
        ],
      });
    }
  }
}
