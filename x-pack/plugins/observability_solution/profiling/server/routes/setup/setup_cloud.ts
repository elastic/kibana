/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetupState } from '@kbn/profiling-data-access-plugin/common/cloud_setup';
import { enableResourceManagement, setMaximumBuckets } from '../../lib/setup/cluster_settings';
import {
  createCollectorPackagePolicy,
  createSymbolizerPackagePolicy,
  removeProfilingFromApmPackagePolicy,
} from '../../lib/setup/fleet_policies';
import { ProfilingCloudSetupOptions } from '../../lib/setup/types';

export async function setupCloud({
  setupState,
  setupParams,
}: {
  setupState: CloudSetupState;
  setupParams: ProfilingCloudSetupOptions;
}) {
  const executeAdminFunctions = [
    ...(setupState.resource_management.enabled ? [] : [enableResourceManagement]),
    ...(setupState.settings.configured ? [] : [setMaximumBuckets]),
  ];

  const executeViewerFunctions = [
    ...(setupState.policies.collector.installed ? [] : [createCollectorPackagePolicy]),
    ...(setupState.policies.symbolizer.installed ? [] : [createSymbolizerPackagePolicy]),
    ...(setupState.policies.apm.profilingEnabled ? [removeProfilingFromApmPackagePolicy] : []),
  ];
  // Give priority to admin functions as if something fails we won't procceed to viewer functions
  await Promise.all(executeAdminFunctions.map((fn) => fn(setupParams)));
  await Promise.all(executeViewerFunctions.map((fn) => fn(setupParams)));
}
