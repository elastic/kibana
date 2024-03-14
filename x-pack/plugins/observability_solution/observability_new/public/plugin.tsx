/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import {
  DEFAULT_APP_CATEGORIES,
  type AppMountParameters,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { LogsExplorerLocatorParams, LOGS_EXPLORER_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type {
  ConfigSchema,
  ObservabilityPluginSetup,
  ObservabilityPluginSetupDependencies,
  ObservabilityPluginStart,
  ObservabilityPluginStartDependencies,
} from './types';
import { createService } from './features/ai_assistant/service/create_service';
import { ObservabilityAIAssistantService } from './features/ai_assistant/types';
import { createObservabilityRuleTypeRegistry } from './features/alerts_and_slos/rules/create_observability_rule_type_registry';
import { registerObservabilityRuleTypes } from './features/alerts_and_slos/rules/register_observability_rule_types';
import { createUseRulesLink } from './features/alerts_and_slos/hooks/create_use_rules_link';
import { getCreateSLOFlyoutLazy } from './features/alerts_and_slos/pages/slo_edit/shared_flyout/get_create_slo_flyout';

export class ObservabilityPlugin
  implements
    Plugin<
      ObservabilityPluginSetup,
      ObservabilityPluginStart,
      ObservabilityPluginSetupDependencies,
      ObservabilityPluginStartDependencies
    >
{
  logger: Logger;
  service?: ObservabilityAIAssistantService;
  observabilityRuleTypeRegistry?: ReturnType<typeof createObservabilityRuleTypeRegistry>;
  config: ConfigSchema;
  version: string;
  isDev: boolean;

  private lazyRegisterAlertsTableConfiguration() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_register_observability_alerts_table_configuration" */
      './features/alerts_and_slos/components/alerts_table/register_alerts_table_configuration'
    );
  }
  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.version = context.env.packageInfo.version;
    this.isDev = context.env.mode.dev;
  }
  setup(
    coreSetup: CoreSetup,
    pluginsSetup: ObservabilityPluginSetupDependencies
  ): ObservabilityPluginSetup {
    const logsExplorerLocator =
      pluginsSetup.share.url.locators.get<LogsExplorerLocatorParams>(LOGS_EXPLORER_LOCATOR_ID);

    this.observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistry(
      pluginsSetup.triggersActionsUi.ruleTypeRegistry
    );

    registerObservabilityRuleTypes(
      this.observabilityRuleTypeRegistry,
      coreSetup.uiSettings,
      logsExplorerLocator
    );

    coreSetup.application.register({
      id: 'observabilityNew',
      title: i18n.translate('xpack.observabilityNew.appTitle', {
        defaultMessage: 'Observability New',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/observability_new',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: [],
      deepLinks: [
        {
          id: 'conversations',
          title: i18n.translate('xpack.observabilityAiAssistant.conversationsDeepLinkTitle', {
            defaultMessage: 'Conversations',
          }),
          path: '/conversations/new',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        const { ruleTypeRegistry, actionTypeRegistry } = (
          pluginsStart as ObservabilityPluginStartDependencies
        ).triggersActionsUi;

        ReactDOM.render(
          <Application
            appMountParameters={appMountParameters}
            config={this.config}
            coreStart={coreStart}
            observabilityRuleTypeRegistry={this.observabilityRuleTypeRegistry!}
            pluginsStart={
              {
                ...pluginsStart,
                ruleTypeRegistry,
                actionTypeRegistry,
              } as unknown as ObservabilityPluginStartDependencies
            }
            pluginsSetup={pluginsSetup}
            service={this.service!}
          />,
          appMountParameters.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
        };
      },
    });

    /*
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

        const registerSloErrorBudgetEmbeddableFactory = async () => {
          const { SloErrorBudgetEmbeddableFactoryDefinition } = await import(
            './embeddable/slo/error_budget/slo_error_budget_embeddable_factory'
          );
          const factory = new SloErrorBudgetEmbeddableFactoryDefinition(coreSetup.getStartServices);
          pluginsSetup.embeddable.registerEmbeddableFactory(factory.type, factory);
        };
        registerSloErrorBudgetEmbeddableFactory();

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
    */

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityPluginStartDependencies
  ): ObservabilityPluginStart {
    // Create AI Assistant service
    const service = (this.service = createService({
      analytics: coreStart.analytics,
      coreStart,
      enabled: coreStart.application.capabilities.observabilityAIAssistant?.show === true,
      licenseStart: pluginsStart.licensing,
      securityStart: pluginsStart.security,
      shareStart: pluginsStart.share,
    }));

    service.register(async ({ registerRenderFunction }) => {
      const mod = await import('./features/ai_assistant/functions');

      return mod.registerFunctions({
        service,
        pluginsStart,
        registerRenderFunction,
      });
    });

    // Observability
    const { alertsTableConfigurationRegistry } = pluginsStart.triggersActionsUi;
    this.lazyRegisterAlertsTableConfiguration().then(({ registerAlertsTableConfiguration }) => {
      return registerAlertsTableConfiguration(
        alertsTableConfigurationRegistry,
        this.observabilityRuleTypeRegistry!,
        this.config
      );
    });

    const { ruleTypeRegistry, actionTypeRegistry } = pluginsStart.triggersActionsUi;

    return {
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      useRulesLink: createUseRulesLink(),
      getCreateSLOFlyout: getCreateSLOFlyoutLazy({
        config: this.config,
        core: coreStart,
        isDev: this.isDev,
        kibanaVersion: this.version,
        observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry!,
        plugins: { ...pluginsStart, ruleTypeRegistry, actionTypeRegistry },
        isServerless: !!pluginsStart.serverless,
      }),
    };
  }
}
