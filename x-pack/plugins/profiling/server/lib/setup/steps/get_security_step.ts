/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';

const PROFILING_READER_ROLE_NAME = 'profiling-reader';

export function getSecurityStep({
  client,
  logger,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  const esClient = client.getEsClient();

  return {
    name: 'security',
    hasCompleted: () => {
      return esClient.security
        .getRole({
          name: PROFILING_READER_ROLE_NAME,
        })
        .then(
          () => {
            return Promise.resolve(true);
          },
          (error) => {
            logger.debug('Could not fetch profiling-reader role');
            logger.debug(error);
            return Promise.resolve(false);
          }
        );
    },
    init: async () => {
      await esClient.security.putRole({
        name: PROFILING_READER_ROLE_NAME,
        indices: [
          {
            names: ['profiling-*'],
            privileges: ['read', 'view_index_metadata'],
          },
        ],
        cluster: ['monitor'],
      });
    },
  };
}
