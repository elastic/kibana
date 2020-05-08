/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
import { AppMountParameters, DEFAULT_APP_CATEGORIES } from '../../../../../src/core/public';
import { UMFrontendLibs } from '../lib/lib';
import { PLUGIN } from '../../common/constants';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../triggers_actions_ui/public';
import { DataPublicPluginSetup } from '../../../../../src/plugins/data/public';
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
}

export class UptimePlugin implements Plugin<void, void, ClientPluginsSetup, ClientPluginsStart> {
  private _store: Store<any, any>;
  private _data: DataPublicPluginSetup | undefined;
  private _triggersActionsUI: TriggersAndActionsUIPublicPluginSetup | undefined;

  constructor(_context: PluginInitializerContext) {
    this._store = initializeStore();
  }

  public async setup(
    core: CoreSetup<ClientPluginsStart, unknown>,
    plugins: ClientPluginsSetup
  ): Promise<void> {
    this._data = plugins.data;
    this._triggersActionsUI = plugins.triggers_actions_ui;

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
      async mount(params: AppMountParameters) {
        const [coreStart, corePlugins] = await core.getStartServices();
        const { getKibanaFrameworkAdapter } = await import(
          '../lib/adapters/framework/new_platform_adapter'
        );

        const { element } = params;

        const libs: UMFrontendLibs = {
          framework: getKibanaFrameworkAdapter(coreStart, plugins, corePlugins, self._store),
        };
        libs.framework.render(element);
        return () => {};
      },
    });
  }

  public start(start: CoreStart, _plugins: {}): void {
    kibanaService.core = start;

    alertTypeInitializers.forEach(init => {
      const alertInitializer = init({
        autocomplete: this._data!.autocomplete,
        store: this._store,
      });
      if (
        this._triggersActionsUI &&
        !this._triggersActionsUI.alertTypeRegistry.has(alertInitializer.id)
      ) {
        this._triggersActionsUI.alertTypeRegistry.register(alertInitializer);
      }
    });
  }

  public stop(): void {}
}
