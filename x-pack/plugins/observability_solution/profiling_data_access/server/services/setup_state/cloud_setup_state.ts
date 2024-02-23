/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecursivePartial } from '@elastic/eui';
import { ProfilingCloudSetupOptions } from '../../../common';
import { CloudSetupState, createDefaultCloudSetupState } from '../../../common/cloud_setup';
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
import { mergePartialSetupStates } from '../../../common/setup';

export async function cloudSetupState(
  params: ProfilingCloudSetupOptions
): Promise<CloudSetupState> {
  const state = createDefaultCloudSetupState();
  state.cloud.available = params.isCloudEnabled;

  const verifyFunctions = [
    validateMaximumBuckets,
    validateResourceManagement,
    validateCollectorPackagePolicy,
    validateSymbolizerPackagePolicy,
    validateProfilingInApmPackagePolicy,
    hasProfilingData,
  ];

  const partialStates = (await Promise.all(verifyFunctions.map((fn) => fn(params)))) as Array<
    RecursivePartial<CloudSetupState>
  >;

  return mergePartialSetupStates(state, partialStates);
}
