/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import ilmProfiling from './ilm_profiling.json';

const LIFECYCLE_POLICY_NAME = 'profiling';

export function getIlmStep({
  client,
  logger,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  const esClient = client.getEsClient();

  return {
    name: 'ilm',
    hasCompleted: () => {
      return esClient.ilm.getLifecycle({ name: LIFECYCLE_POLICY_NAME }).then(
        () => {
          return Promise.resolve(true);
        },
        (error) => {
          logger.debug('ILM policy not installed');
          logger.debug(error);
          return Promise.resolve(false);
        }
      );
    },
    init: async () => {
      await esClient.ilm.putLifecycle({
        name: LIFECYCLE_POLICY_NAME,
        policy: ilmProfiling,
      });
    },
  };
}
