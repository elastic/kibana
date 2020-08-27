/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  AppMountParameters,
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
  CoreStart,
} from '../../../../src/core/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { registerDataHandler } from './data_handler';
import { toggleOverviewLinkInNav } from './toggle_overview_link_in_nav';

export interface ObservabilityPluginSetup {
  dashboard: { register: typeof registerDataHandler };
}

interface SetupPlugins {
  home?: HomePublicPluginSetup;
}

export type ObservabilityPluginStart = void;

export class Plugin implements PluginClass<ObservabilityPluginSetup, ObservabilityPluginStart> {
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: SetupPlugins) {
    core.application.register({
      id: 'observability-overview',
      title: 'Overview',
      order: 8000,
      appRoute: '/app/observability',
      category: DEFAULT_APP_CATEGORIES.observability,

      mount: async (params: AppMountParameters<unknown>) => {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services
        const [coreStart] = await core.getStartServices();

        return renderApp(coreStart, params);
      },
    });

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: 'observability',
        title: i18n.translate('xpack.observability.featureCatalogueTitle', {
          defaultMessage: 'Observability',
        }),
        subtitle: i18n.translate('xpack.observability.featureCatalogueSubtitle', {
          defaultMessage: 'Centralize & monitor',
        }),
        descriptions: [
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
        path: '/app/observability',
        order: 200,
      });
    }

    return {
      dashboard: { register: registerDataHandler },
    };
  }
  public start(core: CoreStart) {
    toggleOverviewLinkInNav(core);
  }
}
