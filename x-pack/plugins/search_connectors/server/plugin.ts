/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  Logger,
  PluginInitializerContext,
  Plugin,
  CoreSetup,
} from '@kbn/core/server';
import { ConnectorServerSideDefinition } from '@kbn/search-connectors';
import { getConnectorTypes } from '../common/lib/connector_types';
import type {
  SearchConnectorsPluginSetup as SearchConnectorsPluginSetup,
  SearchConnectorsPluginStart as SearchConnectorsPluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';

export interface RouteDependencies {
  http: CoreSetup<StartDependencies>['http'];
  logger: Logger;
  router: IRouter;
}

export class SearchConnectorsPlugin
  implements
    Plugin<
      SearchConnectorsPluginSetup,
      SearchConnectorsPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  private readonly logger: Logger;

  private connectors: ConnectorServerSideDefinition[];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.connectors = [];
  }

  public setup({ getStartServices, http }: CoreSetup<StartDependencies>) {
    this.connectors = getConnectorTypes(http.staticAssets);

    return {
      getConnectorTypes: () => this.connectors,
    };
  }

  public start() {
    return {
      getConnectors: () => this.connectors,
    };
  }

  public stop() {}
}
