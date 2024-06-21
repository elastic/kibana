/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  Plugin,
  CoreStart,
  AppMountParameters,
  PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';

import { SearchHomepage } from './embeddable';
import { isHomepageEnabled } from './feature_flags';
import {
  SearchHomepageConfigType,
  SearchHomepagePluginSetup,
  SearchHomepagePluginStart,
  SearchHomepageAppPluginStartDependencies,
  SearchHomepageAppInfo,
} from './types';

const appInfo: SearchHomepageAppInfo = {
  id: PLUGIN_ID,
  appRoute: '/app/elasticsearch/home',
  title: i18n.translate('xpack.searchHomepage.appTitle', { defaultMessage: 'Home' }),
};

export class SearchHomepagePlugin
  implements Plugin<SearchHomepagePluginSetup, SearchHomepagePluginStart, {}, {}>
{
  private readonly config: SearchHomepageConfigType;
  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchHomepageConfigType>();
  }

  public setup(
    core: CoreSetup<SearchHomepageAppPluginStartDependencies, SearchHomepagePluginStart>
  ) {
    const result: SearchHomepagePluginSetup = {
      app: appInfo,
      isHomepageFeatureEnabled() {
        return isHomepageEnabled(core.uiSettings);
      },
    };
    if (!this.config.ui?.enabled) return result;
    if (!isHomepageEnabled(core.uiSettings)) return result;

    core.application.register({
      ...result.app,
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: SearchHomepageAppPluginStartDependencies = {
          ...depsStart,
          history,
        };

        return renderApp(coreStart, startDeps, element);
      },
    });

    return result;
  }

  public start(core: CoreStart) {
    return {
      app: appInfo,
      isHomepageFeatureEnabled() {
        return isHomepageEnabled(core.uiSettings);
      },
      SearchHomepage,
    };
  }
}
