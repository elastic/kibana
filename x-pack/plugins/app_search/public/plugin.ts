/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  AppMountParameters,
} from 'src/core/public';

import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';

import AppSearchLogo from './assets/logo.svg';

export interface ClientConfigType {
  host: string;
}
export interface PluginsSetup {
  home?: HomePublicPluginSetup;
}

export class AppSearchPlugin implements Plugin {
  private config: ClientConfigType;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
  }

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    const config = this.config;

    core.application.register({
      id: 'app_search',
      title: 'App Search',
      euiIconType: AppSearchLogo, // TODO: Temporary - App Search will likely no longer need an icon once the nav structure changes.
      category: DEFAULT_APP_CATEGORIES.management, // TODO - This is likely not final/correct
      order: 10, // TODO - This will also likely not be needed once new nav structure changes land
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./applications/app');

        return renderApp(coreStart, params, config);
      },
    });

    plugins.home.featureCatalogue.register({
      id: 'app_search',
      title: 'App Search',
      icon: AppSearchLogo,
      description:
        'Leverage dashboards, analytics, and APIs for advanced application search made simple.',
      path: '/app/app_search',
      category: FeatureCatalogueCategory.DATA,
      showOnHomePage: true,
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
