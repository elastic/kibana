/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  App,
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { firstValueFrom } from 'rxjs';

import { SloPublicPluginsSetup, SloPublicPluginsStart } from './types'; // TODO move later to type
import { PLUGIN_NAME, PLUGIN_ID } from '../common';
import type { SloPublicSetup, SloPublicStart } from './types';
import { SloDetailsLocatorDefinition } from './locators/slo_details';
import { SloEditLocatorDefinition } from './locators/slo_edit';
import { SloListLocatorDefinition } from './locators/slo_list';
import { getCreateSLOFlyoutLazy } from './pages/slo_edit/shared_flyout/get_create_slo_flyout';

export class SloPlugin
  implements Plugin<SloPublicSetup, SloPublicStart, SloPublicPluginsSetup, SloPublicPluginsStart>
{
  constructor(private readonly initContext: PluginInitializerContext) {} // TODO SLO: Do I need ConfigSchema here?

  public setup(coreSetup: CoreSetup<SloPublicPluginsStart>, pluginsSetup: SloPublicPluginsSetup) {
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

      return renderApp({
        appMountParameters: params,
        core: coreStart,
        // isDev: this.initContext.env.mode.dev,
        kibanaVersion,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: { ...pluginsStart, ruleTypeRegistry, actionTypeRegistry },
        isServerless: !!pluginsStart.serverless, // TODO SLO: do I need isServerless for SLO?
      });
    };

    const app: App = {
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 8001, // 8100 adds it after Cases, 8000 adds it before alerts, 8001 adds it after Alerts
      euiIconType: 'logoObservability',
      appRoute: '/app/slos',
      category: DEFAULT_APP_CATEGORIES.observability,
      // Do I need deep links
      mount,
    };
    // Register an application into the side navigation menu
    coreSetup.application.register(app);

    // TODO SLO: register slo burn rate rule

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

  // TODO SLO: register alert table configuration
  public start(coreStart: CoreStart, plugins: SloPublicPluginsStart) {
    const kibanaVersion = this.initContext.env.packageInfo.version;
    const { ruleTypeRegistry, actionTypeRegistry } = plugins.triggersActionsUi;
    return {
      // getCreateSLOFlyout: getCreateSLOFlyoutLazy({
      //   config,
      //   core: coreStart,
      //   isDev: this.initContext.env.mode.dev,
      //   kibanaVersion,
      //   observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      //   ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
      //   plugins: { ...pluginsStart, ruleTypeRegistry, actionTypeRegistry },
      //   isServerless: !!pluginsStart.serverless,
      // }),
    };
  }

  public stop() {}
}
