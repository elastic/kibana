/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { IEmbeddableSetup } from 'src/plugins/embeddable/public';
import { ResolverEmbeddableFactory } from './embeddables/resolver';
import { i18n } from '@kbn/i18n';

export type EndpointPluginStart = void;
export type EndpointPluginSetup = void;
export interface EndpointPluginSetupDependencies {
  embeddable: IEmbeddableSetup;
}

export interface EndpointPluginStartDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class EndpointPlugin
  implements
    Plugin<
      EndpointPluginSetup,
      EndpointPluginStart,
      EndpointPluginSetupDependencies,
      EndpointPluginStartDependencies
    > {
  public setup(_core: CoreSetup, plugins: EndpointPluginSetupDependencies) {
    const resolverEmbeddableFactory = new ResolverEmbeddableFactory();
    _core.application.register({
      id: 'endpoint',
      title: i18n.translate('xpack.endpoint.pluginTitle', {
        defaultMessage: 'Endpoint',
      }),
      async mount(context, params) {
        const { renderApp } = await import('./applications/endpoint');
        return renderApp(context, params);
      },
    });
    
    plugins.embeddable.registerEmbeddableFactory(
      resolverEmbeddableFactory.type,
      resolverEmbeddableFactory
    );
  }

  public start() {}

  public stop() {}
}
