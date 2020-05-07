/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { LicenseCheck } from '../license_checks';

export interface AnomalyDetectorsProvider {
  anomalyDetectorsProvider(
    callAsCurrentUser: APICaller
  ): {
    jobs(jobId?: string): Promise<any>;
  };
}

export function getAnomalyDetectorsProvider(isFullLicense: LicenseCheck): AnomalyDetectorsProvider {
  return {
    anomalyDetectorsProvider(callAsCurrentUser: APICaller) {
      return {
        jobs(jobId?: string) {
          isFullLicense();
          return callAsCurrentUser('ml.jobs', jobId !== undefined ? { jobId } : {});
        },
      };
    },
  };
}
