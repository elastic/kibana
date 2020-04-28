/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyCoreStart, AppMountParameters } from 'src/core/public';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
import { UMFrontendLibs } from '../lib/lib';
import { PLUGIN } from '../../common/constants';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';
import { getKibanaFrameworkAdapter } from '../lib/adapters/framework/new_platform_adapter';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../triggers_actions_ui/public';
import { DataPublicPluginSetup } from '../../../../../src/plugins/data/public';

export interface StartObject {
  core: LegacyCoreStart;
  plugins: any;
}

export interface ClientPluginsSetup {
  data: DataPublicPluginSetup;
  home: HomePublicPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}

export interface ClientPluginsStart {
  embeddable: EmbeddableStart;
}

export class UptimePlugin implements Plugin<void, void, ClientPluginsSetup, ClientPluginsStart> {
  constructor(_context: PluginInitializerContext) {}

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

    core.application.register({
      appRoute: '/app/uptime#/',
      id: PLUGIN.ID,
      euiIconType: 'uptimeApp',
      order: 8900,
      title: PLUGIN.TITLE,
      async mount(params: AppMountParameters) {
        const [coreStart, corePlugins] = await core.getStartServices();
        const { element } = params;
        const libs: UMFrontendLibs = {
          framework: getKibanaFrameworkAdapter(coreStart, plugins, corePlugins),
        };
        libs.framework.render(element);
        return () => {};
      },
    });
  }

  public start(_start: CoreStart, _plugins: {}): void {}

  public stop(): void {}
}
