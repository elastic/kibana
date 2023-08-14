/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { APMDataAccessConfig } from '.';

export interface ApmDataAccessPluginSetup {
  apmIndicesFromConfigFile: APMDataAccessConfig['indices'];
  getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMDataAccessConfig['indices']>;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApmDataAccessPluginStart {}
