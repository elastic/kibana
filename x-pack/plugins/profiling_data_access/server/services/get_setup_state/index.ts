/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateMaximumBuckets,
  validateResourceManagement,
} from '../../../common/cluster_settings';
import {
  validateCollectorPackagePolicy,
  validateProfilingInApmPackagePolicy,
  validateSymbolizerPackagePolicy,
} from '../../../common/fleet_policies';
import { hasProfilingData } from '../../../common/has_profiling_data';
import { ProfilingESClient } from '../../../common/profiling_es_client';
import { validateSecurityRole } from '../../../common/security_role';
import {
  ProfilingSetupOptions,
  createDefaultSetupState,
  mergePartialSetupStates,
} from '../../../common/setup';
import { RegisterServicesParams } from '../register_services';

export async function getSetupState(
  options: ProfilingSetupOptions,
  clientWithProfilingAuth: ProfilingESClient
) {
  const state = createDefaultSetupState();
  state.cloud.available = options.isCloudEnabled;

  const verifyFunctions = [
    validateMaximumBuckets,
    validateResourceManagement,
    validateSecurityRole,
    validateCollectorPackagePolicy,
    validateSymbolizerPackagePolicy,
    validateProfilingInApmPackagePolicy,
  ];

  const partialStates = await Promise.all([
    ...verifyFunctions.map((fn) => fn(options)),
    hasProfilingData({
      ...options,
      client: clientWithProfilingAuth,
    }),
  ]);

  return mergePartialSetupStates(state, partialStates);
}

export function createGetSetupState(params: RegisterServicesParams) {
  return getSetupState;
}
