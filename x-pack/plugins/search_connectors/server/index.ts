/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';

import { SearchConnectorsPlugin } from './plugin';
export { config } from './config';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new SearchConnectorsPlugin(initializerContext);
}

export type { SearchConnectorsPluginSetup, SearchConnectorsPluginStart } from './types';
export type { CONNECTOR_DEFINITIONS, ConnectorServerSideDefinition } from '../common/connectors';
