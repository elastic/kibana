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
          // Removed while https://github.com/elastic/kibana/issues/64588 exists.
          // SIEM are calling this endpoint with a dummy request object from their alerting
          // integration and currently alerting does not supply a request object.
          // await hasMlCapabilities(['canGetJobs']);

          return await getGuards(request)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient }) => {
              const { jobsSummary } = jobServiceProvider(scopedClient);
              jobsSummary(...args);
            });
        },
      };
    },
  };
}
