/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { jobServiceProvider } from '../../models/job_service';
import { GetGuards } from '../shared_services';

type OrigJobServiceProvider = ReturnType<typeof jobServiceProvider>;

export interface JobServiceProvider {
  jobServiceProvider(
    request: KibanaRequest
  ): {
    jobsSummary: OrigJobServiceProvider['jobsSummary'];
  };
}

export function getJobServiceProvider(getGuards: GetGuards): JobServiceProvider {
  return {
    jobServiceProvider(request: KibanaRequest) {
      return {
        jobsSummary: async (...args) => {
          return await getGuards(request)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient }) => {
              const { jobsSummary } = jobServiceProvider(scopedClient);
              return jobsSummary(...args);
            });
        },
      };
    },
  };
}
