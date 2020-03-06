/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin as IPlugin,
} from '../../../../src/core/public';
import {
  HomePublicPluginSetup,
  FeatureCatalogueCategory,
} from '../../../../src/plugins/home/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { IEmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { Start as NewsfeedStart } from '../../../../src/plugins/newsfeed/public';
import { Start as InspectorStart } from '../../../../src/plugins/inspector/public';
import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { initTelemetry } from './lib/telemetry';
import { KibanaServices } from './lib/kibana';

export { AppMountParameters, CoreSetup, CoreStart, PluginInitializerContext };

export interface SetupPlugins {
  home: HomePublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}
export interface StartPlugins {
  data: DataPublicPluginStart;
  embeddable: IEmbeddableStart;
  inspector: InspectorStart;
  newsfeed?: NewsfeedStart;
  uiActions: UiActionsStart;
}
export type StartServices = CoreStart & StartPlugins;

export type Setup = ReturnType<Plugin['setup']>;
export type Start = ReturnType<Plugin['start']>;

export class Plugin implements IPlugin<Setup, Start> {
  public id = 'siem';
  public name = 'SIEM';

  constructor(
    // @ts-ignore this is added to satisfy the New Platform typing constraint,
    // but we're not leveraging any of its functionality yet.
    private readonly initializerContext: PluginInitializerContext
  ) {}

  public setup(core: CoreSetup, plugins: SetupPlugins) {
    initTelemetry(plugins.usageCollection, this.id);

    plugins.home.featureCatalogue.register({
      id: this.id,
      title: 'SIEM',
      description: i18n.translate('xpack.siem.featureCatalogueDescription', {
        defaultMessage: 'Explore security metrics and logs for events and alerts',
      }),
      icon: 'securityAnalyticsApp',
      path: `/app/${this.id}`,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });

    core.application.register({
      id: this.id,
      title: this.name,
      euiIconType: 'securityAnalyticsApp',
      async mount(context, params) {
        const [coreStart, startPlugins] = await core.getStartServices();
        const { renderApp } = await import('./app');

        return renderApp(coreStart, startPlugins as StartPlugins, params);
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    KibanaServices.init({ ...core, ...plugins });

    return {};
  }

  public stop() {
    return {};
  }
}
