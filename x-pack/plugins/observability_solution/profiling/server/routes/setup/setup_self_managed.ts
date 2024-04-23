/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupOptions, SetupState } from '@kbn/profiling-data-access-plugin/common/setup';
import { enableResourceManagement, setMaximumBuckets } from '../../lib/setup/cluster_settings';

export async function setupSelfManaged({
  setupState,
  setupParams,
}: {
  setupState: SetupState;
  setupParams: ProfilingSetupOptions;
}) {
  const executeFunctions = [
    ...(setupState.resource_management.enabled ? [] : [enableResourceManagement]),
    ...(setupState.settings.configured ? [] : [setMaximumBuckets]),
  ];

  await Promise.all(executeFunctions.map((fn) => fn(setupParams)));
}
