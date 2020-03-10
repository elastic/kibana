/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'src/core/server';

export interface AnomalyDetectorsProvider {
  anomalyDetectorsProvider(
    callAsCurrentUser: APICaller
  ): {
    jobs(jobId?: string): Promise<any>;
  };
}

export function getAnomalyDetectorsProvider(checkLicense: () => void) {
  return {
    anomalyDetectorsProvider(callAsCurrentUser: APICaller) {
      return {
        jobs(jobId?: string) {
          checkLicense();
          return callAsCurrentUser('ml.jobs', jobId !== undefined ? { jobId } : {});
        },
      };
    },
  };
}
