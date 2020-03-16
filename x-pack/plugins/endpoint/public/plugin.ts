/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, AppMountParameters, CoreStart } from 'kibana/public';
import { IEmbeddableSetup } from 'src/plugins/embeddable/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { i18n } from '@kbn/i18n';
import { ResolverEmbeddableFactory } from './embeddables/resolver';

export type EndpointPluginStart = void;
export type EndpointPluginSetup = void;
export interface EndpointPluginSetupDependencies {
  embeddable: IEmbeddableSetup;
  data: DataPublicPluginStart;
}
export interface EndpointPluginStartDependencies {
  data: DataPublicPluginStart;
}

/**
 * Functionality that the endpoint plugin uses from core.
 */
export interface EndpointPluginServices extends Partial<CoreStart> {
  http: CoreStart['http'];
  overlays: CoreStart['overlays'] | undefined;
  notifications: CoreStart['notifications'] | undefined;
  data: DataPublicPluginStart;
}

export class EndpointPlugin
  implements
    Plugin<
      EndpointPluginSetup,
      EndpointPluginStart,
      EndpointPluginSetupDependencies,
      EndpointPluginStartDependencies
    > {
  public setup(
    core: CoreSetup<EndpointPluginStartDependencies>,
    plugins: EndpointPluginSetupDependencies
  ) {
    core.application.register({
      id: 'endpoint',
      title: i18n.translate('xpack.endpoint.pluginTitle', {
        defaultMessage: 'Endpoint',
      }),
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./applications/endpoint');
        return renderApp(coreStart, depsStart, params);
      },
    });

    const resolverEmbeddableFactory = new ResolverEmbeddableFactory();

    plugins.embeddable.registerEmbeddableFactory(
      resolverEmbeddableFactory.type,
      resolverEmbeddableFactory
    );
  }

  public start() {}

  public stop() {}
}
