/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';

const MAX_BUCKETS = 150000;

export function getClusterSettingsStep({
  client,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  return {
    name: 'cluster_settings',
    hasCompleted: async () => {
      const settings = await client.getEsClient().cluster.getSettings({});

      return settings.persistent.search?.max_buckets === MAX_BUCKETS.toString();
    },
    init: async () => {
      await client.getEsClient().cluster.putSettings({
        persistent: {
          search: {
            max_buckets: MAX_BUCKETS,
          },
        },
      });
    },
  };
}
