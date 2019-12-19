/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { IEmbeddableSetup } from 'src/plugins/embeddable/public';
import { i18n } from '@kbn/i18n';
import { ResolverEmbeddableFactory } from './embeddables/resolver';

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
  public setup(core: CoreSetup, plugins: EndpointPluginSetupDependencies) {
    const resolverEmbeddableFactory = new ResolverEmbeddableFactory();
    core.application.register({
      id: 'endpoint',
      title: i18n.translate('xpack.endpoint.pluginTitle', {
        defaultMessage: 'Endpoint',
      }),
      async mount(params) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./applications/endpoint');
        return renderApp(coreStart, params);
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
