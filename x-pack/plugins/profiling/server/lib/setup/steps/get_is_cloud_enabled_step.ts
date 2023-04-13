/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';

export function getIsCloudEnabledStep({
  isCloudEnabled,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  return {
    name: 'is_cloud',
    hasCompleted: async () => {
      return isCloudEnabled;
    },
    init: async () => {
      if (!isCloudEnabled) {
        throw new Error(`Universal Profiling is only available on Elastic Cloud.`);
      }
    },
  };
}
