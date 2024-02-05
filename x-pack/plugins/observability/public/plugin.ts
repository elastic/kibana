/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesDeepLinkId, CasesUiStart, getCasesDeepLinks } from '@kbn/cases-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import {
  App,
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
import { map } from 'rxjs/operators';

import { AiopsPluginStart } from '@kbn/aiops-plugin/public/types';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { ExploratoryViewPublicStart } from '@kbn/exploratory-view-plugin/public';
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import {
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
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
import { firstValueFrom } from 'rxjs';

import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { observabilityAppId, observabilityFeatureId } from '../common';
import {
  ALERTS_PATH,
  CASES_PATH,
  OBSERVABILITY_BASE_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
  SLOS_PATH,
} from '../common/locators/paths';
import { registerDataHandler } from './context/has_data_context/data_handler';
import { createUseRulesLink } from './hooks/create_use_rules_link';
import { RulesLocatorDefinition } from './locators/rules';
import { RuleDetailsLocatorDefinition } from './locators/rule_details';
import { SloDetailsLocatorDefinition } from './locators/slo_details';
import { SloEditLocatorDefinition } from './locators/slo_edit';
import { SloListLocatorDefinition } from './locators/slo_list';
import {
  createObservabilityRuleTypeRegistry,
  ObservabilityRuleTypeRegistry,
} from './rules/create_observability_rule_type_registry';
import { registerObservabilityRuleTypes } from './rules/register_observability_rule_types';

export interface ConfigSchema {
  unsafe: {
    alertDetails: {
      metrics: {
        enabled: boolean;
      };
      logs?: {
        enabled: boolean;
      };
      uptime: {
        enabled: boolean;
      };
      observability: {
        enabled: boolean;
      };
    };
    thresholdRule?: {
      enabled: boolean;
    };
  };
}
export type ObservabilityPublicSetup = ReturnType<Plugin['setup']>;
export interface ObservabilityPublicPluginsSetup {
  data: DataPublicPluginSetup;
  fieldFormats: FieldFormatsSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPluginSetup;
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
  cases: CasesUiStart;
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
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart;
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
      navLinkStatus: AppNavLinkStatus.hidden,
      deepLinks: [
        {
          id: 'rules',
          title: i18n.translate('xpack.observability.rulesLinkTitle', {
            defaultMessage: 'Rules',
          }),
          path: RULES_PATH,
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
      path: SLOS_PATH,
    },
    getCasesDeepLinks({
      basePath: CASES_PATH,
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
    const kibanaVersion = this.initContext.env.packageInfo.version;

    this.observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistry(
      pluginsSetup.triggersActionsUi.ruleTypeRegistry
    );

    const rulesLocator = pluginsSetup.share.url.locators.create(new RulesLocatorDefinition());

    const ruleDetailsLocator = pluginsSetup.share.url.locators.create(
      new RuleDetailsLocatorDefinition()
    );

    const sloDetailsLocator = pluginsSetup.share.url.locators.create(
      new SloDetailsLocatorDefinition()
    );
    const sloEditLocator = pluginsSetup.share.url.locators.create(new SloEditLocatorDefinition());
    const sloListLocator = pluginsSetup.share.url.locators.create(new SloListLocatorDefinition());

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
      searchable: !Boolean(pluginsSetup.serverless),
    };

    coreSetup.application.register(app);

    registerObservabilityRuleTypes(config, this.observabilityRuleTypeRegistry, logsExplorerLocator);

    const assertPlatinumLicense = async () => {
      const licensing = await pluginsSetup.licensing;
      const license = await firstValueFrom(licensing.license$);

      const hasPlatinumLicense = license.hasAtLeast('platinum');
      if (hasPlatinumLicense) {
        const registerSloOverviewEmbeddableFactory = async () => {
          const { SloOverviewEmbeddableFactoryDefinition } = await import(
            './embeddable/slo/overview/slo_embeddable_factory'
          );
          const factory = new SloOverviewEmbeddableFactoryDefinition(coreSetup.getStartServices);
          pluginsSetup.embeddable.registerEmbeddableFactory(factory.type, factory);
        };
        registerSloOverviewEmbeddableFactory();
        const registerSloAlertsEmbeddableFactory = async () => {
          const { SloAlertsEmbeddableFactoryDefinition } = await import(
            './embeddable/slo/alerts/slo_alerts_embeddable_factory'
          );
          const factory = new SloAlertsEmbeddableFactoryDefinition(
            coreSetup.getStartServices,
            kibanaVersion
          );
          pluginsSetup.embeddable.registerEmbeddableFactory(factory.type, factory);
        };
        registerSloAlertsEmbeddableFactory();

        const registerAsyncSloAlertsUiActions = async () => {
          if (pluginsSetup.uiActions) {
            const { registerSloAlertsUiActions } = await import('./ui_actions');
            registerSloAlertsUiActions(pluginsSetup.uiActions, coreSetup);
          }
        };
        registerAsyncSloAlertsUiActions();
      }
    };

    assertPlatinumLicense();

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
        map((value) => {
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
            .map((link) => ({
              app: observabilityAppId,
              label: link.title,
              path: link.path ?? '',
            }));

          return [
            {
              label: '',
              sortKey: 100,
              entries: [...overviewLink, ...otherLinks],
            },
          ];
        })
      )
    );

    return {
      dashboard: { register: registerDataHandler },
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      useRulesLink: createUseRulesLink(),
      rulesLocator,
      ruleDetailsLocator,
      sloDetailsLocator,
      sloEditLocator,
      sloListLocator,
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

    return {
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      useRulesLink: createUseRulesLink(),
    };
  }
}
