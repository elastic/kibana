/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ApmDataAccessPlugin } = await import('./plugin');
  return new ApmDataAccessPlugin(initializerContext);
}

export type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
  ApmDataAccessServices,
  ApmDataAccessServicesParams,
  APMEventClientConfig,
  APMEventESSearchRequest,
  APMLogEventESSearchRequest,
  DocumentSourcesRequest,
  HostNamesRequest,
  GetDocumentTypeParams,
} from './types';

export { APMEventClient } from './lib/helpers';
