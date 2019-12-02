/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin } from 'kibana/public';
import { IEmbeddableStart } from 'src/plugins/embeddable/public';
import { ResolverEmbeddableFactory } from './embeddables/resolver';

export type EndpointPluginStart = void;
export type EndpointPluginSetup = void;
export interface EndpointPluginSetupDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface

export interface EndpointPluginStartDependencies {
  embeddable: IEmbeddableStart;
}

export class EndpointPlugin
  implements
    Plugin<
      EndpointPluginSetup,
      EndpointPluginStart,
      EndpointPluginSetupDependencies,
      EndpointPluginStartDependencies
    > {
  public setup() {}

  public start(...args: [unknown, EndpointPluginStartDependencies]) {
    const [, plugins] = args;
    const resolverEmbeddableFactory = new ResolverEmbeddableFactory();
    plugins.embeddable.registerEmbeddableFactory(
      resolverEmbeddableFactory.type,
      resolverEmbeddableFactory
    );
  }

  public stop() {}
}
