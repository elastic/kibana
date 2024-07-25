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
  PluginInitializerContext,
} from '@kbn/core/public';
import { Logger } from '@kbn/logging';

import { BehaviorSubject } from 'rxjs';
import {
  EntityManagerPluginClass,
  EntityManagerPluginSetup,
  EntityManagerPluginStart,
  EntityManagerPublicPluginStart,
} from './types';
import type { EntityManagerPublicConfig } from '../common/config';
import { EntityClient } from './lib/entity_client';

export class Plugin implements EntityManagerPluginClass {
  public config: EntityManagerPublicConfig;
  public logger: Logger;
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(private readonly context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(
    core: CoreSetup<EntityManagerPluginStart, EntityManagerPublicPluginStart>,
    pluginSetup: EntityManagerPluginSetup
  ) {
    const kibanaVersion = this.context.env.packageInfo.version;

    const mount = async (params: AppMountParameters<unknown>) => {
      const { renderApp } = await import('./application');
      const [coreStart, pluginsStart] = await core.getStartServices();

      return renderApp({
        appMountParameters: params,
        core: coreStart,
        isDev: this.context.env.mode.dev,
        kibanaVersion,
        usageCollection: pluginSetup.usageCollection,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        plugins: pluginsStart,
        isServerless: !!pluginsStart.serverless,
      });
    };

    const appUpdater$ = this.appUpdater$;
    const app: App = {
      id: 'entity_manager',
      title: 'Entity Manager',
      order: 8002,
      updater$: appUpdater$,
      euiIconType: 'logoObservability',
      appRoute: '/app/entity_manager',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount,
      visibleIn: ['sideNav'],
      keywords: ['observability', 'monitor', 'entities'],
    };

    // Register an application into the side navigation menu
    core.application.register(app);

    const entityClient = new EntityClient(core);
    return {
      entityClient,
    };
  }

  start(core: CoreStart) {
    const entityClient = new EntityClient(core);
    return {
      entityClient,
    };
  }

  stop() {}
}
