/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { APMIndices } from '.';
import { registerServices } from './services/register_services';

export interface ApmDataAccessPluginSetup {
  apmIndicesFromConfigFile: APMIndices;
  getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMIndices>;
  services: ReturnType<typeof registerServices>;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApmDataAccessPluginStart {}
