/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NOTE: Originally copied from plugins/observability/public/plugin.ts, heavily modified

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '@kbn/core/public';

import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

export type AssetInventoryPublicSetup = ReturnType<Plugin['setup']>;

export interface AssetInventoryPublicPluginsSetup {
  data: DataPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export interface AssetInventoryPublicPluginsStart {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export type AssetInventoryPublicStart = ReturnType<Plugin['start']>;

export class Plugin
  implements
    PluginClass<
      AssetInventoryPublicSetup,
      AssetInventoryPublicStart,
      AssetInventoryPublicPluginsSetup,
      AssetInventoryPublicPluginsStart
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(private readonly initContext: PluginInitializerContext<{}>) {}

  public setup(
    coreSetup: CoreSetup<AssetInventoryPublicPluginsStart, AssetInventoryPublicStart>,
    pluginsSetup: AssetInventoryPublicPluginsSetup
  ) {
    const category = DEFAULT_APP_CATEGORIES.observability;
    const euiIconType = 'logoObservability';
    const config = this.initContext.config.get();

    const mount = async (params: AppMountParameters<unknown>) => {
      // Load application bundle
      const { renderApp } = await import('./app');
      // Get start services
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();

      return renderApp({
        core: coreStart,
        config,
        plugins: pluginsStart,
        appMountParameters: params,
        // ObservabilityPageTemplate: navigation.PageTemplate,
        usageCollection: pluginsSetup.usageCollection,
        isDev: this.initContext.env.mode.dev,
      });
    };

    const appUpdater$ = this.appUpdater$;
    const app = {
      appRoute: '/app/asset-inventory',
      category,
      euiIconType,
      id: 'assetInventory',
      mount,
      order: 8000,
      title: i18n.translate('xpack.observability.overviewLinkTitle', {
        defaultMessage: 'Overview',
      }),
      updater$: appUpdater$,
      keywords: [
        'observability',
        'monitor',
        'logs',
        'metrics',
        'apm',
        'performance',
        'trace',
        'agent',
        'rum',
        'user',
        'experience',
      ],
    };

    coreSetup.application.register(app);

    return {};
  }

  public start(coreStart: CoreStart, pluginsStart: AssetInventoryPublicPluginsStart) {}
}
