/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { LicenseCheck } from '../license_checks';
import { Job } from '../../../common/types/anomaly_detection_jobs';

export interface AnomalyDetectorsProvider {
  anomalyDetectorsProvider(
    callAsCurrentUser: LegacyAPICaller
  ): {
    jobs(jobId?: string): Promise<{ count: number; jobs: Job[] }>;
  };
}

export function getAnomalyDetectorsProvider(isFullLicense: LicenseCheck): AnomalyDetectorsProvider {
  return {
    anomalyDetectorsProvider(callAsCurrentUser: LegacyAPICaller) {
      return {
        jobs(jobId?: string) {
          isFullLicense();
          return callAsCurrentUser('ml.jobs', jobId !== undefined ? { jobId } : {});
        },
      };
    },
  };
}
