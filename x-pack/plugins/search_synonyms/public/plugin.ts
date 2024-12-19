/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Subscription } from 'rxjs';

import { AppStatus } from '@kbn/core/public';
import type {
  AppUpdater,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  AppMountParameters,
  CoreStart,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';
import {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchSynonymsConfigType,
  SearchSynonymsPluginSetup,
  SearchSynonymsPluginStart,
} from './types';
import { SYNONYMS_UI_FLAG } from '.';

export class SearchSynonymsPlugin
  implements Plugin<SearchSynonymsPluginSetup, SearchSynonymsPluginStart>
{
  private config: SearchSynonymsConfigType;
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private licenseSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchSynonymsConfigType>();
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchSynonymsPluginStart>,
    _: AppPluginSetupDependencies
  ): SearchSynonymsPluginSetup {
    if (!this.config.ui?.enabled && !core.uiSettings.get<boolean>(SYNONYMS_UI_FLAG, false)) {
      return {};
    }
    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/elasticsearch/synonyms',
      title: PLUGIN_NAME,
      deepLinks: [
        {
          id: 'synonyms',
          path: PLUGIN_PATH,
          title: i18n.translate('xpack.searchSynonyms.appTitle', {
            defaultMessage: 'Synonyms',
          }),
          visibleIn: ['globalSearch'],
        },
      ],
      status: AppStatus.inaccessible,
      updater$: this.appUpdater$,
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();

        coreStart.chrome.docTitle.change(PLUGIN_NAME);

        const startDeps: AppPluginStartDependencies = {
          ...depsStart,
          history,
        };

        depsStart.searchNavigation?.handleOnAppMount();

        return renderApp(coreStart, startDeps, element);
      },
      visibleIn: [],
    });

    return {};
  }

  public start(_: CoreStart, deps: AppPluginStartDependencies): SearchSynonymsPluginStart {
    const { licensing } = deps;
    this.licenseSubscription = licensing.license$.subscribe((license) => {
      const status: AppStatus =
        license && license.isAvailable && license.isActive && license.hasAtLeast('enterprise')
          ? AppStatus.accessible
          : AppStatus.inaccessible;

      this.appUpdater$.next(() => ({ status }));
    });
    return {};
  }

  public stop() {
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
    }
  }
}
