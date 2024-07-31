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
import { SLO_OVERVIEW_EMBEDDABLE_ID } from './embeddable/slo/overview/constants';
import { SloOverviewEmbeddableState } from './embeddable/slo/overview/types';
import { SLO_ERROR_BUDGET_ID } from './embeddable/slo/error_budget/constants';
import { SLO_ALERTS_EMBEDDABLE_ID } from './embeddable/slo/alerts/constants';

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
      const { observabilityRuleTypeRegistry } = pluginsStart.observability;

      return renderApp({
        appMountParameters: params,
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        observabilityRuleTypeRegistry,
        kibanaVersion,
        usageCollection: pluginsSetup.usageCollection,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: pluginsStart,
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
      const licensing = pluginsSetup.licensing;
      const license = await firstValueFrom(licensing.license$);

      const hasPlatinumLicense = license.hasAtLeast('platinum');
      if (hasPlatinumLicense) {
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();
        pluginsStart.dashboard.registerDashboardPanelPlacementSetting(
          SLO_OVERVIEW_EMBEDDABLE_ID,
          (serializedState: SloOverviewEmbeddableState | undefined) => {
            if (serializedState?.showAllGroupByInstances || serializedState?.groupFilters) {
              return { width: 24, height: 8 };
            }
            return { width: 12, height: 8 };
          }
        );
        pluginsSetup.embeddable.registerReactEmbeddableFactory(
          SLO_OVERVIEW_EMBEDDABLE_ID,
          async () => {
            const { getOverviewEmbeddableFactory } = await import(
              './embeddable/slo/overview/slo_embeddable_factory'
            );
            return getOverviewEmbeddableFactory(coreSetup.getStartServices);
          }
        );

        pluginsSetup.embeddable.registerReactEmbeddableFactory(
          SLO_ALERTS_EMBEDDABLE_ID,
          async () => {
            const { getAlertsEmbeddableFactory } = await import(
              './embeddable/slo/alerts/slo_alerts_embeddable_factory'
            );

            return getAlertsEmbeddableFactory(coreSetup.getStartServices, kibanaVersion);
          }
        );

        pluginsSetup.embeddable.registerReactEmbeddableFactory(SLO_ERROR_BUDGET_ID, async () => {
          const deps = { ...coreStart, ...pluginsStart };

          const { getErrorBudgetEmbeddableFactory } = await import(
            './embeddable/slo/error_budget/error_budget_react_embeddable_factory'
          );
          return getErrorBudgetEmbeddableFactory(deps);
        });

        const registerAsyncSloUiActions = async () => {
          if (pluginsSetup.uiActions) {
            const { registerSloUiActions } = await import('./ui_actions');

            registerSloUiActions(coreSetup, pluginsSetup, pluginsStart);
          }
        };
        registerAsyncSloUiActions();
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
    return {
      getCreateSLOFlyout: getCreateSLOFlyoutLazy({
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        kibanaVersion,
        observabilityRuleTypeRegistry: pluginsStart.observability.observabilityRuleTypeRegistry,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: pluginsStart,
        isServerless: !!pluginsStart.serverless,
        experimentalFeatures: this.experimentalFeatures,
      }),
    };
  }

  public stop() {}
}
