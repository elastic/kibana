/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient, KibanaRequest } from 'kibana/server';
import { jobServiceProvider } from '../../models/job_service';
import { SharedServicesChecks } from '../shared_services';

type OrigJobServiceProvider = ReturnType<typeof jobServiceProvider>;

export interface JobServiceProvider {
  jobServiceProvider(
    mlClusterClient: ILegacyScopedClusterClient,
    request: KibanaRequest
  ): {
    jobsSummary: OrigJobServiceProvider['jobsSummary'];
  };
}

export function getJobServiceProvider({
  isFullLicense,
  getHasMlCapabilities,
}: SharedServicesChecks): JobServiceProvider {
  return {
    jobServiceProvider(mlClusterClient: ILegacyScopedClusterClient, request: KibanaRequest) {
      // const hasMlCapabilities = getHasMlCapabilities(request);
      const { jobsSummary } = jobServiceProvider(mlClusterClient);
      return {
        async jobsSummary(...args) {
          isFullLicense();
          // Removed while https://github.com/elastic/kibana/issues/64588 exists.
          // SIEM are calling this endpoint with a dummy request object from their alerting
          // integration and currently alerting does not supply a request object.
          // await hasMlCapabilities(['canGetJobs']);

          return jobsSummary(...args);
        },
      };
    },
  };
}
