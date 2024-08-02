/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesDeepLinkId, CasesPublicStart, getCasesDeepLinks } from '@kbn/cases-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import {
  App,
  AppDeepLink,
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
  ToastsStart,
} from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { LOGS_EXPLORER_LOCATOR_ID, LogsExplorerLocatorParams } from '@kbn/deeplinks-observability';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import { i18n } from '@kbn/i18n';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type {
  NavigationEntry,
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';

import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { BehaviorSubject, from } from 'rxjs';
import { map, mergeMap } from 'rxjs';

import { AiopsPluginStart } from '@kbn/aiops-plugin/public/types';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { ExploratoryViewPublicStart } from '@kbn/exploratory-view-plugin/public';
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import { observabilityAppId, observabilityFeatureId } from '../common';
import {
  ALERTS_PATH,
  CASES_PATH,
  OBSERVABILITY_BASE_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
} from '../common/locators/paths';
import { registerDataHandler } from './context/has_data_context/data_handler';
import { createUseRulesLink } from './hooks/create_use_rules_link';
import { RulesLocatorDefinition } from './locators/rules';
import { RuleDetailsLocatorDefinition } from './locators/rule_details';
import {
  createObservabilityRuleTypeRegistry,
  ObservabilityRuleTypeRegistry,
} from './rules/create_observability_rule_type_registry';
import { registerObservabilityRuleTypes } from './rules/register_observability_rule_types';

export interface ConfigSchema {
  unsafe: {
    alertDetails: {
      logs?: {
        enabled: boolean;
      };
      uptime: {
        enabled: boolean;
      };
      observability?: {
        enabled: boolean;
      };
    };
    thresholdRule?: {
      enabled: boolean;
    };
    ruleFormV2?: {
      enabled: boolean;
    };
  };
}
export type ObservabilityPublicSetup = ReturnType<Plugin['setup']>;
export interface ObservabilityPublicPluginsSetup {
  data: DataPublicPluginSetup;
  fieldFormats: FieldFormatsSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  home?: HomePublicPluginSetup;
  usageCollection: UsageCollectionSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
  licensing: LicensingPluginSetup;
  serverless?: ServerlessPluginSetup;
  presentationUtil?: PresentationUtilPluginStart;
}
export interface ObservabilityPublicPluginsStart {
  actionTypeRegistry: ActionTypeRegistryContract;
  cases: CasesPublicStart;
  charts: ChartsPluginStart;
  contentManagement: ContentManagementPublicStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  discover: DiscoverStart;
  embeddable: EmbeddableStart;
  exploratoryView: ExploratoryViewPublicStart;
  fieldFormats: FieldFormatsStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  licenseManagement?: LicenseManagementUIPluginSetup;
  navigation: NavigationPublicPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  security: SecurityPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionSetup;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  home?: HomePublicPluginStart;
  cloud?: CloudStart;
  aiops: AiopsPluginStart;
  serverless?: ServerlessPluginStart;
  uiSettings: IUiSettingsClient;
  uiActions: UiActionsStart;
  presentationUtil?: PresentationUtilPluginStart;
  theme: CoreStart['theme'];
  dataViewFieldEditor: DataViewFieldEditorStart;
  toastNotifications: ToastsStart;
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
  private observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry =
    {} as ObservabilityRuleTypeRegistry;

  private lazyRegisterAlertsTableConfiguration() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_register_observability_alerts_table_configuration" */
      './components/alerts_table/register_alerts_table_configuration'
    );
  }

  // Define deep links as constant and hidden. Whether they are shown or hidden
  // in the global navigation will happen in `updateGlobalNavigation`.
  private readonly deepLinks: AppDeepLink[] = [
    {
      id: 'alerts',
      title: i18n.translate('xpack.observability.alertsLinkTitle', {
        defaultMessage: 'Alerts',
      }),
      order: 8001,
      path: ALERTS_PATH,
      visibleIn: [],
      deepLinks: [
        {
          id: 'rules',
          title: i18n.translate('xpack.observability.rulesLinkTitle', {
            defaultMessage: 'Rules',
          }),
          path: RULES_PATH,
          visibleIn: [],
        },
      ],
    },
    getCasesDeepLinks({
      basePath: CASES_PATH,
      extend: {
        [CasesDeepLinkId.cases]: {
          order: 8003,
          visibleIn: [],
        },
        [CasesDeepLinkId.casesCreate]: {
          visibleIn: [],
        },
        [CasesDeepLinkId.casesConfigure]: {
          visibleIn: [],
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
    const kibanaVersion = this.initContext.env.packageInfo.version;

    this.observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistry(
      pluginsSetup.triggersActionsUi.ruleTypeRegistry
    );

    const rulesLocator = pluginsSetup.share.url.locators.create(new RulesLocatorDefinition());

    const ruleDetailsLocator = pluginsSetup.share.url.locators.create(
      new RuleDetailsLocatorDefinition()
    );

    const logsExplorerLocator =
      pluginsSetup.share.url.locators.get<LogsExplorerLocatorParams>(LOGS_EXPLORER_LOCATOR_ID);

    const mount = async (params: AppMountParameters<unknown>) => {
      // Load application bundle
      const { renderApp } = await import('./application');
      // Get start services
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();
      const { ruleTypeRegistry, actionTypeRegistry } = pluginsStart.triggersActionsUi;

      return renderApp({
        appMountParameters: params,
        config,
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        kibanaVersion,
        observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: { ...pluginsStart, ruleTypeRegistry, actionTypeRegistry },
        usageCollection: pluginsSetup.usageCollection,
        isServerless: !!pluginsStart.serverless,
      });
    };

    const appUpdater$ = this.appUpdater$;

    const app: App = {
      appRoute: OBSERVABILITY_BASE_PATH,
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
        'slo',
        'performance',
        'trace',
        'agent',
        'rum',
        'user',
        'experience',
      ],
      visibleIn: Boolean(pluginsSetup.serverless)
        ? ['home', 'kibanaOverview']
        : ['globalSearch', 'home', 'kibanaOverview', 'sideNav'],
    };

    coreSetup.application.register(app);

    registerObservabilityRuleTypes(
      this.observabilityRuleTypeRegistry,
      coreSetup.uiSettings,
      logsExplorerLocator
    );

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
        path: `${OBSERVABILITY_BASE_PATH}/`,
        order: 200,
        isVisible: (capabilities) => {
          const obs = capabilities.catalogue[observabilityFeatureId];
          const uptime = capabilities.catalogue.uptime;
          const infra = capabilities.catalogue.infra;
          const apm = capabilities.catalogue.apm;

          return obs || uptime || infra || apm;
        },
      });
    }

    pluginsSetup.observabilityShared.navigation.registerSections(
      from(appUpdater$).pipe(
        mergeMap((value) =>
          from(coreSetup.getStartServices()).pipe(
            map(([coreStart, pluginsStart]) => {
              const deepLinks = value(app)?.deepLinks ?? [];

              const overviewLink = !Boolean(pluginsSetup.serverless)
                ? [
                    {
                      label: i18n.translate('xpack.observability.overviewLinkTitle', {
                        defaultMessage: 'Overview',
                      }),
                      app: observabilityAppId,
                      path: OVERVIEW_PATH,
                    },
                  ]
                : [];

              const isAiAssistantEnabled =
                pluginsStart.observabilityAIAssistant?.service.isEnabled();

              const aiAssistantLink =
                isAiAssistantEnabled &&
                !Boolean(pluginsSetup.serverless) &&
                Boolean(pluginsSetup.observabilityAIAssistant)
                  ? [
                      {
                        label: i18n.translate('xpack.observability.aiAssistantLinkTitle', {
                          defaultMessage: 'AI Assistant',
                        }),
                        app: 'observabilityAIAssistant',
                        path: '/conversations/new',
                      },
                    ]
                  : [];

              const sloLink = coreStart.application.capabilities.slo?.read
                ? [
                    {
                      label: i18n.translate('xpack.observability.sloLinkTitle', {
                        defaultMessage: 'SLOs',
                      }),
                      app: 'slo',
                      path: '/',
                    },
                  ]
                : [];

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
              const otherLinks = deepLinks.filter((link) => (link.visibleIn ?? []).length > 0);
              const alertsLink: NavigationEntry[] = otherLinks
                .filter((link) => link.id === 'alerts')
                .map((link) => ({
                  app: observabilityAppId,
                  label: link.title,
                  path: link.path ?? '',
                }));

              const casesLink: NavigationEntry[] = otherLinks
                .filter((link) => link.id === 'cases')
                .map((link) => ({
                  app: observabilityAppId,
                  label: link.title,
                  path: link.path ?? '',
                }));

              return [
                {
                  label: '',
                  sortKey: 100,
                  entries: [
                    ...overviewLink,
                    ...alertsLink,
                    ...sloLink,
                    ...casesLink,
                    ...aiAssistantLink,
                  ],
                },
              ];
            })
          )
        )
      )
    );

    return {
      dashboard: { register: registerDataHandler },
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      useRulesLink: createUseRulesLink(),
      rulesLocator,
      ruleDetailsLocator,
      config,
    };
  }

  public start(coreStart: CoreStart, pluginsStart: ObservabilityPublicPluginsStart) {
    const { application } = coreStart;
    const config = this.initContext.config.get();
    const { alertsTableConfigurationRegistry } = pluginsStart.triggersActionsUi;
    this.lazyRegisterAlertsTableConfiguration().then(({ registerAlertsTableConfiguration }) => {
      return registerAlertsTableConfiguration(
        alertsTableConfigurationRegistry,
        this.observabilityRuleTypeRegistry,
        config
      );
    });

    pluginsStart.observabilityShared.updateGlobalNavigation({
      capabilities: application.capabilities,
      deepLinks: this.deepLinks,
      updater$: this.appUpdater$,
    });

    import('./navigation_tree').then(({ definition }) => {
      return pluginsStart.navigation.addSolutionNavigation(definition);
    });

    return {
      config,
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      useRulesLink: createUseRulesLink(),
    };
  }
}
