/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient, KibanaRequest } from 'kibana/server';
import { Job } from '../../../common/types/anomaly_detection_jobs';
import { SharedServicesChecks } from '../shared_services';

export interface AnomalyDetectorsProvider {
  anomalyDetectorsProvider(
    mlClusterClient: ILegacyScopedClusterClient,
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
    anomalyDetectorsProvider(mlClusterClient: ILegacyScopedClusterClient, request: KibanaRequest) {
      //  APM is using this service in anomaly alert, kibana alerting doesn't provide request object
      // So we are adding a dummy request for now
      // TODO: Remove this once kibana alerting provides request object
      const hasMlCapabilities =
        request.params !== 'DummyKibanaRequest'
          ? getHasMlCapabilities(request)
          : (_caps: string[]) => Promise.resolve();
      return {
        async jobs(jobId?: string) {
          isFullLicense();
          await hasMlCapabilities(['canGetJobs']);
          return mlClusterClient.callAsInternalUser(
            'ml.jobs',
            jobId !== undefined ? { jobId } : {}
          );
        },
      };
    },
  };
}
