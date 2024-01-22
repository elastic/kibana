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
import { hasProfilingData } from '../../../common/has_profiling_data';
import {
  createDefaultSetupState,
  mergePartialSetupStates,
  ProfilingSetupOptions,
  SetupState,
} from '../../../common/setup';

export async function selfManagedSetupState(params: ProfilingSetupOptions): Promise<SetupState> {
  const state = createDefaultSetupState();

  const verifyFunctions = [validateMaximumBuckets, validateResourceManagement, hasProfilingData];

  const partialStates = await Promise.all(verifyFunctions.map((fn) => fn(params)));

  return mergePartialSetupStates(state, partialStates);
}
