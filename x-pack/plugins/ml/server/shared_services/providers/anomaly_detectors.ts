/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { Job } from '../../../common/types/anomaly_detection_jobs';
import { GetGuards } from '../shared_services';

export interface AnomalyDetectorsProvider {
  anomalyDetectorsProvider(
    request: KibanaRequest
  ): {
    jobs(jobId?: string): Promise<{ count: number; jobs: Job[] }>;
  };
}

export function getAnomalyDetectorsProvider(getGuards: GetGuards): AnomalyDetectorsProvider {
  return {
    anomalyDetectorsProvider(request: KibanaRequest) {
      return {
        async jobs(jobId?: string) {
          return await getGuards(request)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient }) => {
              const { body } = await scopedClient.asInternalUser.ml.getJobs<{
                count: number;
                jobs: Job[];
              }>(jobId !== undefined ? { job_id: jobId } : undefined);
              return body;
            });
        },
      };
    },
  };
}
