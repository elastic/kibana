/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  AppMountParameters,
} from 'kibana/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../../src/core/public';
import { UMFrontendLibs } from '../lib/lib';
import { PLUGIN } from '../../common/constants';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../triggers_actions_ui/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { alertTypeInitializers } from '../lib/alert_types';
import { initializeStore } from '../state';
import { kibanaService } from '../state/kibana_service';

export interface ClientPluginsSetup {
  data: DataPublicPluginSetup;
  home: HomePublicPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}

export interface ClientPluginsStart {
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
}

export type ClientSetup = void;
export type ClientStart = void;

export class UptimePlugin
  implements Plugin<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart> {
  private _store: Store<any, any>;
  constructor(_context: PluginInitializerContext) {
    this._store = initializeStore();
  }

  public async setup(
    core: CoreSetup<ClientPluginsStart, unknown>,
    plugins: ClientPluginsSetup
  ): Promise<void> {
    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: PLUGIN.ID,
        title: PLUGIN.TITLE,
        description: PLUGIN.DESCRIPTION,
        icon: 'uptimeApp',
        path: '/app/uptime#/',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      });
    }

    const self = this;
    core.application.register({
      appRoute: '/app/uptime#/',
      id: PLUGIN.ID,
      euiIconType: 'uptimeApp',
      order: 8900,
      title: PLUGIN.TITLE,
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, corePlugins] = await core.getStartServices();
        const { getKibanaFrameworkAdapter } = await import(
          '../lib/adapters/framework/new_platform_adapter'
        );

        const { element } = params;

        const libs: UMFrontendLibs = {
          framework: getKibanaFrameworkAdapter(coreStart, plugins, corePlugins, self._store),
        };
        return libs.framework.render(element);
      },
    });
  }

  public start(start: CoreStart, plugins: ClientPluginsStart): void {
    kibanaService.core = start;
    alertTypeInitializers.forEach((init) => {
      const alertInitializer = init({
        store: this._store,
        core: start,
        plugins,
      });
      if (
        plugins.triggers_actions_ui &&
        !plugins.triggers_actions_ui.alertTypeRegistry.has(alertInitializer.id)
      ) {
        plugins.triggers_actions_ui.alertTypeRegistry.register(alertInitializer);
      }
    });
  }

  public stop(): void {}
}
