/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigSchema } from '.';
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
} from '../../../../src/core/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import type {
  HomePublicPluginSetup,
  HomePublicPluginStart,
} from '../../../../src/plugins/home/public';
import { CasesUiStart } from '../../cases/public';
import type { LensPublicStart } from '../../lens/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public';
import { observabilityAppId, observabilityFeatureId } from '../common';
import { createLazyObservabilityPageTemplate } from './components/shared';
import { registerDataHandler } from './data_handler';
import { createObservabilityRuleTypeRegistry } from './rules/create_observability_rule_type_registry';
import { createCallObservabilityApi } from './services/call_observability_api';
import { createNavigationRegistry, NavigationEntry } from './services/navigation_registry';
import { updateGlobalNavigation } from './update_global_navigation';

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
  private readonly navigationRegistry = createNavigationRegistry();

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
    },
    {
      id: 'cases',
      title: i18n.translate('xpack.observability.casesLinkTitle', {
        defaultMessage: 'Cases',
      }),
      order: 8002,
      path: '/cases',
      navLinkStatus: AppNavLinkStatus.hidden,
    },
  ];

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
    };

    coreSetup.application.register(app);

    if (pluginsSetup.home) {
      pluginsSetup.home.featureCatalogue.registerSolution({
        id: observabilityFeatureId,
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
      observabilityRuleTypeRegistry,
      isAlertingExperienceEnabled: () => config.unsafe.alertingExperience.enabled,
      navigation: {
        registerSections: this.navigationRegistry.registerSections,
      },
    };
  }

  public start({ application }: CoreStart) {
    const config = this.initializerContext.config.get();

    updateGlobalNavigation({
      capabilities: application.capabilities,
      config,
      deepLinks: this.deepLinks,
      updater$: this.appUpdater$,
    });

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
