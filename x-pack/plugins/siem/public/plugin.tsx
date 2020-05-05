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
import { APP_ID, APP_NAME, APP_PATH, APP_ICON } from '../common/constants';
import { initTelemetry } from './lib/telemetry';
import { KibanaServices } from './lib/kibana/services';
import { serviceNowActionType, jiraActionType } from './lib/connectors';

export interface SetupPlugins {
  home: HomePublicPluginSetup;
  security: SecurityPluginSetup;
  triggers_actions_ui: TriggersActionsSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface StartPlugins {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  newsfeed?: NewsfeedStart;
  triggers_actions_ui: TriggersActionsStart;
  uiActions: UiActionsStart;
}

export type StartServices = CoreStart &
  StartPlugins & {
    security: SecurityPluginSetup;
  };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins) {
    initTelemetry(plugins.usageCollection, APP_ID);

    plugins.home.featureCatalogue.register({
      id: APP_ID,
      title: i18n.translate('xpack.siem.featureCatalogue.title', {
        defaultMessage: 'SIEM',
      }),
      description: i18n.translate('xpack.siem.featureCatalogue.description', {
        defaultMessage: 'Explore security metrics and logs for events and alerts',
      }),
      icon: APP_ICON,
      path: APP_PATH,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });

    plugins.triggers_actions_ui.actionTypeRegistry.register(serviceNowActionType());
    plugins.triggers_actions_ui.actionTypeRegistry.register(jiraActionType());

    core.application.register({
      id: APP_ID,
      title: APP_NAME,
      order: 9000,
      euiIconType: APP_ICON,
      async mount(params: AppMountParameters) {
        const [coreStart, startPlugins] = await core.getStartServices();
        const { renderApp } = await import('./app');
        const services = {
          ...coreStart,
          ...startPlugins,
          security: plugins.security,
        } as StartServices;

        return renderApp(services, params);
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
