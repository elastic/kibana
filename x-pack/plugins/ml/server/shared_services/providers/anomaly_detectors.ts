/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller, KibanaRequest } from 'kibana/server';
import { Job } from '../../../common/types/anomaly_detection_jobs';
import { SharedServicesChecks } from '../shared_services';

export interface AnomalyDetectorsProvider {
  anomalyDetectorsProvider(
    callAsCurrentUser: LegacyAPICaller,
    request: KibanaRequest
  ): {
    jobs(jobId?: string): Promise<{ count: number; jobs: Job[] }>;
  };
}

export function getAnomalyDetectorsProvider({
  isFullLicense,
  getHasMlCapabilities,
}: SharedServicesChecks): AnomalyDetectorsProvider {
  return {
    anomalyDetectorsProvider(callAsCurrentUser: LegacyAPICaller, request: KibanaRequest) {
      const hasMlCapabilities = getHasMlCapabilities(request);
      return {
        async jobs(jobId?: string) {
          isFullLicense();
          await hasMlCapabilities(['canGetJobs']);
          return callAsCurrentUser('ml.jobs', jobId !== undefined ? { jobId } : {});
        },
      };
    },
  };
}
