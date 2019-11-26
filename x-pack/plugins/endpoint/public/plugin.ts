/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { ResolverEmbeddableFactory } from './embeddables/resolver';
import { Plugin as EmbeddablePlugin } from '../../../../src/plugins/embeddable/public';

interface StartDependencies {
  embeddable: ReturnType<EmbeddablePlugin['start']>;
}

export class EndpointPlugin implements Plugin<{}, {}> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'endpoint',
      title: i18n.translate('xpack.endpoint.pluginTitle', {
        defaultMessage: 'Endpoint',
      }),
      async mount(context, params) {
        const { renderApp } = await import('./applications/endpoint');
        return renderApp(context, params);
      },
    });
    return {};
  }

  public start(...args: [unknown, StartDependencies]) {
    const [, plugins] = args;
    const resolverEmbeddableFactory = new ResolverEmbeddableFactory();
    plugins.embeddable.registerEmbeddableFactory(
      resolverEmbeddableFactory.type,
      resolverEmbeddableFactory
    );
    return {};
  }

  public stop() {}
}
