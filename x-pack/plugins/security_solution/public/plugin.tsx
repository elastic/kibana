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
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/public';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { initTelemetry } from './common/lib/telemetry';
import { KibanaServices } from './common/lib/kibana/services';
import { serviceNowActionType, jiraActionType } from './common/lib/connectors';
import { PluginSetup, PluginStart, SetupPlugins, StartPlugins, StartServices } from './types';
import { APP_ID, APP_NAME, APP_ICON, APP_PATH } from '../common/constants';
import { ConfigureEndpointDatasource } from './management/pages/policy/view/ingest_manager_integration/configure_datasource';

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins) {
    initTelemetry(plugins.usageCollection, APP_ID);

    plugins.home.featureCatalogue.register({
      id: APP_ID,
      title: i18n.translate('xpack.securitySolution.featureCatalogue.title', {
        defaultMessage: 'Security',
      }),
      description: i18n.translate('xpack.securitySolution.featureCatalogue.description', {
        defaultMessage: 'Explore security metrics and logs for events and alerts',
      }),
      icon: APP_ICON,
      path: APP_PATH,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });

    plugins.triggers_actions_ui.actionTypeRegistry.register(serviceNowActionType());
    plugins.triggers_actions_ui.actionTypeRegistry.register(jiraActionType());

    const mountSecurityApp = async (params: AppMountParameters) => {
      const [coreStart, startPlugins] = await core.getStartServices();
      const { renderApp } = await import('./app');
      const services = {
        ...coreStart,
        ...startPlugins,
        security: plugins.security,
      } as StartServices;

      const alertsSubPlugin = new (await import('./alerts')).Alerts();
      const casesSubPlugin = new (await import('./cases')).Cases();
      const hostsSubPlugin = new (await import('./hosts')).Hosts();
      const networkSubPlugin = new (await import('./network')).Network();
      const overviewSubPlugin = new (await import('./overview')).Overview();
      const timelinesSubPlugin = new (await import('./timelines')).Timelines();
      const endpointAlertsSubPlugin = new (await import('./endpoint_alerts')).EndpointAlerts();
      const managementSubPlugin = new (await import('./management')).Management();

      const alertsStart = alertsSubPlugin.start();
      const casesStart = casesSubPlugin.start();
      const hostsStart = hostsSubPlugin.start();
      const networkStart = networkSubPlugin.start();
      const overviewStart = overviewSubPlugin.start();
      const timelinesStart = timelinesSubPlugin.start();
      const endpointAlertsStart = endpointAlertsSubPlugin.start(coreStart, startPlugins);
      const managementSubPluginStart = managementSubPlugin.start(coreStart, startPlugins);

      return renderApp(services, params, {
        routes: [
          ...alertsStart.routes,
          ...casesStart.routes,
          ...hostsStart.routes,
          ...networkStart.routes,
          ...overviewStart.routes,
          ...timelinesStart.routes,
          ...endpointAlertsStart.routes,
          ...managementSubPluginStart.routes,
        ],
        store: {
          initialState: {
            ...hostsStart.store.initialState,
            ...networkStart.store.initialState,
            ...timelinesStart.store.initialState,
            ...endpointAlertsStart.store.initialState,
            ...managementSubPluginStart.store.initialState,
          },
          reducer: {
            ...hostsStart.store.reducer,
            ...networkStart.store.reducer,
            ...timelinesStart.store.reducer,
            ...endpointAlertsStart.store.reducer,
            ...managementSubPluginStart.store.reducer,
          },
          middlewares: [
            ...(endpointAlertsStart.store.middleware ?? []),
            ...(managementSubPluginStart.store.middleware ?? []),
          ],
        },
      });
    };

    core.application.register({
      id: APP_ID,
      title: APP_NAME,
      order: 9000,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_PATH,
      async mount(params: AppMountParameters) {
        return mountSecurityApp(params);
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion });
    plugins.ingestManager.registerDatasource('endpoint', ConfigureEndpointDatasource);

    return {};
  }

  public stop() {
    return {};
  }
}
