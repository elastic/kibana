/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
  CoreStart,
} from '../../../../src/core/public';
import { HomePublicPluginSetup, HomePublicPluginStart } from '../../../../src/plugins/home/public';
import { registerDataHandler } from './data_handler';
import { toggleOverviewLinkInNav } from './toggle_overview_link_in_nav';
import { LensPublicStart } from '../../lens/public';

export interface ObservabilityPublicSetup {
  dashboard: { register: typeof registerDataHandler };
}

export interface ObservabilityPublicPluginsSetup {
  data: DataPublicPluginSetup;
  home?: HomePublicPluginSetup;
}

export interface ObservabilityPublicPluginsStart {
  home?: HomePublicPluginStart;
  data: DataPublicPluginStart;
  lens: LensPublicStart;
}

export type ObservabilityPublicStart = void;

export class Plugin
  implements
    PluginClass<
      ObservabilityPublicSetup,
      ObservabilityPublicStart,
      ObservabilityPublicPluginsSetup,
      ObservabilityPublicPluginsStart
    > {
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<ObservabilityPublicPluginsStart>,
    plugins: ObservabilityPublicPluginsSetup
  ) {
    const category = DEFAULT_APP_CATEGORIES.observability;
    const euiIconType = 'logoObservability';
    const mount = async (params: AppMountParameters<unknown>) => {
      // Load application bundle
      const { renderApp } = await import('./application');
      // Get start services
      const [coreStart, startPlugins] = await core.getStartServices();

      return renderApp(coreStart, startPlugins, params);
    };
    const updater$ = this.appUpdater$;

    core.application.register({
      id: 'observability-overview',
      title: 'Overview',
      appRoute: '/app/observability',
      order: 8000,
      category,
      euiIconType,
      mount,
      updater$,
    });

    if (core.uiSettings.get('observability:enableAlertingExperience')) {
      core.application.register({
        id: 'observability-alerts',
        title: 'Alerts',
        appRoute: '/app/observability/alerts',
        order: 8025,
        category,
        euiIconType,
        mount,
        updater$,
      });

      core.application.register({
        id: 'observability-cases',
        title: 'Cases',
        appRoute: '/app/observability/cases',
        order: 8050,
        category,
        euiIconType,
        mount,
        updater$,
      });
    }

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
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

    return {
      dashboard: { register: registerDataHandler },
    };
  }
  public start({ application }: CoreStart) {
    toggleOverviewLinkInNav(this.appUpdater$, application);
  }
}
