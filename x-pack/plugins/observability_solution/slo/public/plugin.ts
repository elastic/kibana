/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  App,
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { SloPublicPluginsSetup, SloPublicPluginsStart } from './types';
import { PLUGIN_NAME, sloAppId } from '../common';
import type { SloPublicSetup, SloPublicStart } from './types';
import { SloDetailsLocatorDefinition } from './locators/slo_details';
import { SloEditLocatorDefinition } from './locators/slo_edit';
import { SloListLocatorDefinition } from './locators/slo_list';
import { SLOS_BASE_PATH } from '../common/locators/paths';
import { getCreateSLOFlyoutLazy } from './pages/slo_edit/shared_flyout/get_create_slo_flyout';
import { registerBurnRateRuleType } from './rules/register_burn_rate_rule_type';
import { ExperimentalFeatures, SloConfig } from '../common/config';

export class SloPlugin
  implements Plugin<SloPublicSetup, SloPublicStart, SloPublicPluginsSetup, SloPublicPluginsStart>
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private experimentalFeatures: ExperimentalFeatures = { ruleFormV2: { enabled: false } };

  constructor(private readonly initContext: PluginInitializerContext<SloConfig>) {
    this.experimentalFeatures =
      this.initContext.config.get().experimental ?? this.experimentalFeatures;
  }

  public setup(
    coreSetup: CoreSetup<SloPublicPluginsStart, SloPublicStart>,
    pluginsSetup: SloPublicPluginsSetup
  ) {
    const kibanaVersion = this.initContext.env.packageInfo.version;

    const sloDetailsLocator = pluginsSetup.share.url.locators.create(
      new SloDetailsLocatorDefinition()
    );
    const sloEditLocator = pluginsSetup.share.url.locators.create(new SloEditLocatorDefinition());
    const sloListLocator = pluginsSetup.share.url.locators.create(new SloListLocatorDefinition());

    const mount = async (params: AppMountParameters<unknown>) => {
      const { renderApp } = await import('./application');
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();
      const { ruleTypeRegistry, actionTypeRegistry } = pluginsStart.triggersActionsUi;
      const { observabilityRuleTypeRegistry } = pluginsStart.observability;

      return renderApp({
        appMountParameters: params,
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        observabilityRuleTypeRegistry,
        kibanaVersion,
        usageCollection: pluginsSetup.usageCollection,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: { ...pluginsStart, ruleTypeRegistry, actionTypeRegistry },
        isServerless: !!pluginsStart.serverless,
        experimentalFeatures: this.experimentalFeatures,
      });
    };
    const appUpdater$ = this.appUpdater$;
    const app: App = {
      id: sloAppId,
      title: PLUGIN_NAME,
      order: 8002,
      updater$: appUpdater$,
      euiIconType: 'logoObservability',
      appRoute: SLOS_BASE_PATH,
      category: DEFAULT_APP_CATEGORIES.observability,
      mount,
      keywords: ['observability', 'monitor', 'slos'],
    };
    // Register an application into the side navigation menu
    coreSetup.application.register(app);

    registerBurnRateRuleType(pluginsSetup.observability.observabilityRuleTypeRegistry);

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

    return {
      sloDetailsLocator,
      sloEditLocator,
      sloListLocator,
    };
  }

  public start(coreStart: CoreStart, pluginsStart: SloPublicPluginsStart) {
    const kibanaVersion = this.initContext.env.packageInfo.version;
    const { ruleTypeRegistry, actionTypeRegistry } = pluginsStart.triggersActionsUi;

    return {
      getCreateSLOFlyout: getCreateSLOFlyoutLazy({
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        kibanaVersion,
        observabilityRuleTypeRegistry: pluginsStart.observability.observabilityRuleTypeRegistry,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: { ...pluginsStart, ruleTypeRegistry, actionTypeRegistry },
        isServerless: !!pluginsStart.serverless,
        experimentalFeatures: this.experimentalFeatures,
      }),
    };
  }

  public stop() {}
}
