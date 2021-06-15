/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject, of } from 'rxjs';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '../../../../src/core/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import type {
  HomePublicPluginSetup,
  HomePublicPluginStart,
} from '../../../../src/plugins/home/public';
import type { LensPublicStart } from '../../lens/public';
import { registerDataHandler } from './data_handler';
import { createCallObservabilityApi } from './services/call_observability_api';
import { createNavigationRegistry } from './services/navigation_registry';
import { toggleOverviewLinkInNav } from './toggle_overview_link_in_nav';
import { ConfigSchema } from '.';
import { createObservabilityRuleTypeRegistry } from './rules/create_observability_rule_type_registry';
import { createLazyObservabilityPageTemplate } from './components/shared';
import { CASES_APP_ID } from './components/app/cases/constants';
import { CasesUiStart } from '../../cases/public';

export type ObservabilityPublicSetup = ReturnType<Plugin['setup']>;

export interface ObservabilityPublicPluginsSetup {
  data: DataPublicPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  home?: HomePublicPluginSetup;
}

export interface ObservabilityPublicPluginsStart {
  cases: CasesUiStart;
  home?: HomePublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
  lens: LensPublicStart;
}

export type ObservabilityPublicStart = ReturnType<Plugin['start']>;

export class Plugin
  implements
    PluginClass<
      ObservabilityPublicSetup,
      ObservabilityPublicStart,
      ObservabilityPublicPluginsSetup,
      ObservabilityPublicPluginsStart
    > {
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private readonly casesAppUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private readonly navigationRegistry = createNavigationRegistry();

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    coreSetup: CoreSetup<ObservabilityPublicPluginsStart, ObservabilityPublicStart>,
    pluginsSetup: ObservabilityPublicPluginsSetup
  ) {
    const category = DEFAULT_APP_CATEGORIES.observability;
    const euiIconType = 'logoObservability';
    const config = this.initializerContext.config.get();

    createCallObservabilityApi(coreSetup.http);

    const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistry(
      pluginsSetup.triggersActionsUi.alertTypeRegistry
    );

    const mount = async (params: AppMountParameters<unknown>) => {
      // Load application bundle
      const { renderApp } = await import('./application');
      // Get start services
      const [coreStart, pluginsStart, { navigation }] = await coreSetup.getStartServices();

      return renderApp({
        config,
        core: coreStart,
        plugins: pluginsStart,
        appMountParameters: params,
        observabilityRuleTypeRegistry,
        ObservabilityPageTemplate: navigation.PageTemplate,
      });
    };

    const updater$ = this.appUpdater$;

    coreSetup.application.register({
      id: 'observability-overview',
      title: 'Overview',
      appRoute: '/app/observability',
      order: 8000,
      category,
      euiIconType,
      mount,
      updater$,
    });
    if (config.unsafe.alertingExperience.enabled) {
      coreSetup.application.register({
        id: 'observability-alerts',
        title: 'Alerts',
        appRoute: '/app/observability/alerts',
        order: 8025,
        category,
        euiIconType,
        mount,
        updater$,
      });
    }

    if (config.unsafe.cases.enabled) {
      coreSetup.application.register({
        id: CASES_APP_ID,
        title: 'Cases',
        appRoute: '/app/observability/cases',
        order: 8050,
        category,
        euiIconType,
        mount,
        updater$: this.casesAppUpdater$,
      });
    }

    if (pluginsSetup.home) {
      pluginsSetup.home.featureCatalogue.registerSolution({
        id: 'observability',
        title: i18n.translate('xpack.observability.featureCatalogueTitle', {
          defaultMessage: 'Observability',
        }),
        subtitle: i18n.translate('xpack.observability.featureCatalogueSubtitle', {
          defaultMessage: 'Centralize & monitor',
        }),
        description: i18n.translate('xpack.observability.featureCatalogueDescription', {
          defaultMessage:
            'Consolidate your logs, metrics, application traces, and system availability with purpose-built UIs.',
        }),
        appDescriptions: [
          i18n.translate('xpack.observability.featureCatalogueDescription1', {
            defaultMessage: 'Monitor infrastructure metrics.',
          }),
          i18n.translate('xpack.observability.featureCatalogueDescription2', {
            defaultMessage: 'Trace application requests.',
          }),
          i18n.translate('xpack.observability.featureCatalogueDescription3', {
            defaultMessage: 'Measure SLAs and react to issues.',
          }),
        ],
        icon: 'logoObservability',
        path: '/app/observability/',
        order: 200,
      });
    }

    this.navigationRegistry.registerSections(
      of([
        {
          label: '',
          sortKey: 100,
          entries: [{ label: 'Overview', app: 'observability-overview', path: '/overview' }],
        },
      ])
    );

    return {
      dashboard: { register: registerDataHandler },
      observabilityRuleTypeRegistry,
      isAlertingExperienceEnabled: () => config.unsafe.alertingExperience.enabled,
      navigation: {
        registerSections: this.navigationRegistry.registerSections,
      },
    };
  }
  public start({ application }: CoreStart) {
    toggleOverviewLinkInNav(this.appUpdater$, this.casesAppUpdater$, application);

    const PageTemplate = createLazyObservabilityPageTemplate({
      currentAppId$: application.currentAppId$,
      getUrlForApp: application.getUrlForApp,
      navigateToApp: application.navigateToApp,
      navigationSections$: this.navigationRegistry.sections$,
    });

    return {
      navigation: {
        PageTemplate,
      },
    };
  }
}
