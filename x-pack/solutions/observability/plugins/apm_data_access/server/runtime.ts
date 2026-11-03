/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmDataAccessPluginSetup } from './types';
import { getServices } from './services/get_services';

/**
 * What APM data access exposes: the APM indices (resolved by APM sources access) and the data
 * services. Shared by the plugin's `server` entry and its tasks entry.
 */
export const createApmDataAccessSetup = (
  apmSourcesAccess: Pick<ApmDataAccessPluginSetup, 'apmIndicesFromConfigFile' | 'getApmIndices'>
): ApmDataAccessPluginSetup => ({
  // TODO: Deprecate and replace with apmSourcesAccess
  apmIndicesFromConfigFile: apmSourcesAccess.apmIndicesFromConfigFile,
  // TODO: Deprecate and replace with apmSourcesAccess
  getApmIndices: apmSourcesAccess.getApmIndices,
  getServices,
});
