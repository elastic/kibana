/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { APMIndices } from '.';
import { getServices } from './services/get_services';

export interface ApmDataAccessPluginSetup {
  apmIndicesFromConfigFile: APMIndices;
  getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMIndices>;
  getServices: typeof getServices;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApmDataAccessPluginStart {}

export type ApmDataAccessServices = ReturnType<typeof getServices>;
export type { ApmDataAccessServicesParams } from './services/get_services';
export type { DocumentSourcesRequest } from './services/get_document_sources';
export type {
  APMEventClientConfig,
  APMEventESSearchRequest,
  APMLogEventESSearchRequest,
} from './lib/helpers';
