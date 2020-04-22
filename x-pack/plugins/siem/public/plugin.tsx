/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { Start as NewsfeedStart } from '../../../../src/plugins/newsfeed/public';
import { Start as InspectorStart } from '../../../../src/plugins/inspector/public';
import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '../../triggers_actions_ui/public';
import { SecurityPluginSetup } from '../../security/public';
import { initTelemetry } from './lib/telemetry';
import { KibanaServices } from './lib/kibana';
import { serviceNowActionType } from './lib/connectors';

export { AppMountParameters, CoreSetup, CoreStart, PluginInitializerContext };

export interface SetupPlugins {
  home: HomePublicPluginSetup;
  security: SecurityPluginSetup;
  triggers_actions_ui: TriggersActionsSetup;
  usageCollection: UsageCollectionSetup;
}

export interface StartPlugins {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  newsfeed?: NewsfeedStart;
  security: SecurityPluginSetup;
  triggers_actions_ui: TriggersActionsStart;
  uiActions: UiActionsStart;
}
export type StartServices = CoreStart & StartPlugins;

export type Setup = ReturnType<Plugin['setup']>;
export type Start = ReturnType<Plugin['start']>;

export class Plugin implements IPlugin<Setup, Start> {
  public id = 'siem';
  public name = 'SIEM';
  private kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, plugins: SetupPlugins) {
    initTelemetry(plugins.usageCollection, this.id);

    plugins.home.featureCatalogue.register({
      id: this.id,
      title: this.name,
      description: 'Explore security metrics and logs for events and alerts',
      icon: 'securityAnalyticsApp',
      path: `/app/${this.id}`,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });

    const security = plugins.security;

    core.application.register({
      id: this.id,
      title: this.name,
      async mount(context, params) {
        const [coreStart, startPlugins] = await core.getStartServices();
        const { renderApp } = await import('./app');

        plugins.triggers_actions_ui.actionTypeRegistry.register(serviceNowActionType());
        return renderApp(coreStart, { ...startPlugins, security } as StartPlugins, params);
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion });

    return {};
  }

  public stop() {
    return {};
  }
}
