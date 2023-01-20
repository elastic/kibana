/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import {
  AppDeepLink,
  AppMountParameters,
  AppNavLinkStatus,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CasesDeepLinkId, CasesUiStart, getCasesDeepLinks } from '@kbn/cases-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import {
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { RuleDetailsLocatorDefinition } from './locators/rule_details';
import { observabilityAppId, observabilityFeatureId, casesPath } from '../common';
import { createLazyObservabilityPageTemplate } from './components/shared';
import { registerDataHandler } from './data_handler';
import {
  createObservabilityRuleTypeRegistry,
  ObservabilityRuleTypeRegistry,
} from './rules/create_observability_rule_type_registry';
import { createCallObservabilityApi } from './services/call_observability_api';
import { createNavigationRegistry, NavigationEntry } from './services/navigation_registry';
import { updateGlobalNavigation } from './update_global_navigation';
import { getExploratoryViewEmbeddable } from './components/shared/exploratory_view/embeddable';
import { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/exploratory_view_url';
import { createUseRulesLink } from './hooks/create_use_rules_link';
import getAppDataView from './utils/observability_data_views/get_app_data_view';
import { registerObservabilityRuleTypes } from './rules/register_observability_rule_types';

export interface ConfigSchema {
  unsafe: {
    slo: {
      enabled: boolean;
    };
    alertDetails: {
      apm: {
        enabled: boolean;
      };
      metrics: {
        enabled: boolean;
      };
      logs: {
        enabled: boolean;
      };
      uptime: {
        enabled: boolean;
      };
    };
  };
}
export type ObservabilityPublicSetup = ReturnType<Plugin['setup']>;

export interface ObservabilityPublicPluginsSetup {
  data: DataPublicPluginSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  home?: HomePublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export interface ObservabilityPublicPluginsStart {
  actionTypeRegistry: ActionTypeRegistryContract;
  cases: CasesUiStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  embeddable: EmbeddableStart;
  guidedOnboarding: GuidedOnboardingPluginStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  security: SecurityPluginStart;
  share: SharePluginStart;
  spaces: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionSetup;
  home?: HomePublicPluginStart;
}

export type ObservabilityPublicStart = ReturnType<Plugin['start']>;

export class Plugin
  implements
    PluginClass<
      ObservabilityPublicSetup,
      ObservabilityPublicStart,
      ObservabilityPublicPluginsSetup,
      ObservabilityPublicPluginsStart
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private readonly navigationRegistry = createNavigationRegistry();
  private observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry =
    {} as ObservabilityRuleTypeRegistry;

  // Define deep links as constant and hidden. Whether they are shown or hidden
  // in the global navigation will happen in `updateGlobalNavigation`.
  private readonly deepLinks: AppDeepLink[] = [
    {
      id: 'alerts',
      title: i18n.translate('xpack.observability.alertsLinkTitle', {
        defaultMessage: 'Alerts',
      }),
      order: 8001,
      path: '/alerts',
      navLinkStatus: AppNavLinkStatus.hidden,
      deepLinks: [
        {
          id: 'rules',
          title: i18n.translate('xpack.observability.rulesLinkTitle', {
            defaultMessage: 'Rules',
          }),
          path: '/alerts/rules',
          navLinkStatus: AppNavLinkStatus.hidden,
        },
      ],
    },
    {
      id: 'slos',
      title: i18n.translate('xpack.observability.slosLinkTitle', {
        defaultMessage: 'SLOs',
      }),
      navLinkStatus: AppNavLinkStatus.hidden,
      order: 8002,
      path: '/slos',
    },
    getCasesDeepLinks({
      basePath: casesPath,
      extend: {
        [CasesDeepLinkId.cases]: {
          order: 8003,
          navLinkStatus: AppNavLinkStatus.hidden,
        },
        [CasesDeepLinkId.casesCreate]: {
          navLinkStatus: AppNavLinkStatus.hidden,
          searchable: false,
        },
        [CasesDeepLinkId.casesConfigure]: {
          navLinkStatus: AppNavLinkStatus.hidden,
          searchable: false,
        },
      },
    }),
  ];

  constructor(private readonly initContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    coreSetup: CoreSetup<ObservabilityPublicPluginsStart, ObservabilityPublicStart>,
    pluginsSetup: ObservabilityPublicPluginsSetup
  ) {
    const category = DEFAULT_APP_CATEGORIES.observability;
    const euiIconType = 'logoObservability';
    const config = this.initContext.config.get();

    createCallObservabilityApi(coreSetup.http);

    this.observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistry(
      pluginsSetup.triggersActionsUi.ruleTypeRegistry
    );
    pluginsSetup.share.url.locators.create(new RuleDetailsLocatorDefinition());

    const mount = async (params: AppMountParameters<unknown>) => {
      // Load application bundle
      const { renderApp } = await import('./application');
      // Get start services
      const [coreStart, pluginsStart, { navigation }] = await coreSetup.getStartServices();

      const { ruleTypeRegistry, actionTypeRegistry } = pluginsStart.triggersActionsUi;
      return renderApp({
        core: coreStart,
        config,
        plugins: { ...pluginsStart, ruleTypeRegistry, actionTypeRegistry },
        appMountParameters: params,
        observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
        ObservabilityPageTemplate: navigation.PageTemplate,
        usageCollection: pluginsSetup.usageCollection,
        isDev: this.initContext.env.mode.dev,
      });
    };

    const appUpdater$ = this.appUpdater$;
    const app = {
      appRoute: '/app/observability',
      category,
      deepLinks: this.deepLinks,
      euiIconType,
      id: observabilityAppId,
      mount,
      order: 8000,
      title: i18n.translate('xpack.observability.overviewLinkTitle', {
        defaultMessage: 'Overview',
      }),
      updater$: appUpdater$,
      keywords: [
        'observability',
        'monitor',
        'logs',
        'metrics',
        'apm',
        'performance',
        'trace',
        'agent',
        'rum',
        'user',
        'experience',
      ],
    };

    coreSetup.application.register(app);

    registerObservabilityRuleTypes(config, this.observabilityRuleTypeRegistry);

    if (pluginsSetup.home) {
      pluginsSetup.home.featureCatalogue.registerSolution({
        id: observabilityFeatureId,
        title: i18n.translate('xpack.observability.featureCatalogueTitle', {
          defaultMessage: 'Observability',
        }),
        description: i18n.translate('xpack.observability.featureCatalogueDescription', {
          defaultMessage:
            'Consolidate your logs, metrics, application traces, and system availability with purpose-built UIs.',
        }),
        icon: 'logoObservability',
        path: '/app/observability/',
        order: 200,
      });
    }

    this.navigationRegistry.registerSections(
      from(appUpdater$).pipe(
        map((value) => {
          const deepLinks = value(app)?.deepLinks ?? [];

          const overviewLink = {
            label: i18n.translate('xpack.observability.overviewLinkTitle', {
              defaultMessage: 'Overview',
            }),
            app: observabilityAppId,
            path: '/overview',
          };

          // Reformat the visible links to be NavigationEntry objects instead of
          // AppDeepLink objects.
          //
          // In our case the deep links and sections being registered are the
          // same, and the logic to hide them based on flags or capabilities is
          // the same, so we just want to make a new list with the properties
          // needed by `registerSections`, which are different than the
          // properties used by the deepLinks.
          //
          // See https://github.com/elastic/kibana/issues/103325.
          const otherLinks: NavigationEntry[] = deepLinks
            .filter((link) => link.navLinkStatus === AppNavLinkStatus.visible)
            .filter((link) => (link.id === 'slos' ? config.unsafe.slo.enabled : link))
            .map((link) => ({
              app: observabilityAppId,
              label: link.title,
              path: link.path ?? '',
            }));

          const sections = [
            {
              label: '',
              sortKey: 100,
              entries: [overviewLink, ...otherLinks],
            },
          ];

          return sections;
        })
      )
    );

    return {
      dashboard: { register: registerDataHandler },
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      navigation: {
        registerSections: this.navigationRegistry.registerSections,
      },
      useRulesLink: createUseRulesLink(),
    };
  }

  public start(coreStart: CoreStart, pluginsStart: ObservabilityPublicPluginsStart) {
    const { application } = coreStart;
    const config = this.initContext.config.get();

    const filterSlo = (link: AppDeepLink) =>
      link.id === 'slos' ? config.unsafe.slo.enabled : link;

    updateGlobalNavigation({
      capabilities: application.capabilities,
      deepLinks: this.deepLinks.filter(filterSlo),
      updater$: this.appUpdater$,
    });

    const PageTemplate = createLazyObservabilityPageTemplate({
      currentAppId$: application.currentAppId$,
      getUrlForApp: application.getUrlForApp,
      navigateToApp: application.navigateToApp,
      navigationSections$: this.navigationRegistry.sections$,
      guidedOnboardingApi: pluginsStart.guidedOnboarding.guidedOnboardingApi,
      getPageTemplateServices: () => ({ coreStart }),
    });

    const getAsyncO11yAlertsTableConfiguration = async () => {
      const { getO11yAlertsTableConfiguration } = await import(
        './config/register_alerts_table_configuration'
      );
      return getO11yAlertsTableConfiguration({
        observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
        getAlertLifecycleStatusBadge: pluginsStart.triggersActionsUi.getAlertLifecycleStatusBadge,
        config,
      });
    };

    const { alertsTableConfigurationRegistry } = pluginsStart.triggersActionsUi;
    getAsyncO11yAlertsTableConfiguration().then((alertsTableConfig) => {
      alertsTableConfigurationRegistry.register(alertsTableConfig);
    });

    return {
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      navigation: {
        PageTemplate,
      },
      createExploratoryViewUrl,
      getAppDataView: getAppDataView(pluginsStart.dataViews),
      ExploratoryViewEmbeddable: getExploratoryViewEmbeddable({ ...coreStart, ...pluginsStart }),
      useRulesLink: createUseRulesLink(),
    };
  }
}
