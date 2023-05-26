/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';

export function createStepToInitializeElasticsearch({
  client,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  return {
    name: 'initialize_elasticsearch',
    hasCompleted: async () => {
      const settings = await client.getEsClient().cluster.getSettings({});

      const areProfilingTemplatesEnabled =
        settings.persistent.xpack?.profiling?.templates?.enabled ?? false;

      return areProfilingTemplatesEnabled;
    },
    init: async () => {
      await client.getEsClient().cluster.putSettings({
        persistent: {
          xpack: {
            profiling: {
              templates: {
                enabled: true,
              },
            },
          },
        },
      });
    },
  };
}
