/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { jobServiceProvider } from '../../models/job_service';
import { GetGuards } from '../shared_services';

type OrigJobServiceProvider = ReturnType<typeof jobServiceProvider>;

export interface JobServiceProvider {
  jobServiceProvider(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    jobsSummary: OrigJobServiceProvider['jobsSummary'];
  };
}

export function getJobServiceProvider(getGuards: GetGuards): JobServiceProvider {
  return {
    jobServiceProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
      return {
        jobsSummary: async (...args) => {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(({ scopedClient, mlClient }) => {
              const { jobsSummary } = jobServiceProvider(scopedClient, mlClient);
              return jobsSummary(...args);
            });
        },
      };
    },
  };
}
