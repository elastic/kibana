/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { getConnectorTypes } from './lib/connector_types';
import {
  SearchConnectorsPluginSetup,
  SearchConnectorsPluginSetupDependencies,
  SearchConnectorsPluginStart,
  SearchConnectorsPluginStartDependencies,
} from './types';

export class SearchConnectorsPlugin
  implements
    Plugin<
      SearchConnectorsPluginSetup,
      SearchConnectorsPluginStart,
      SearchConnectorsPluginSetupDependencies,
      SearchConnectorsPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart>,
    setupDeps: SearchConnectorsPluginSetupDependencies
  ): SearchConnectorsPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    services: SearchConnectorsPluginStartDependencies
  ): SearchConnectorsPluginStart {
    const { http } = core;
    const connectorTypes = getConnectorTypes(http);
    return {
      getConnectorTypes: () => connectorTypes,
    };
  }

  public stop() {}
}
