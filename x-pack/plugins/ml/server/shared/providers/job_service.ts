/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'src/core/server';
import { jobServiceProvider } from '../../models/job_service';

export interface JobServiceProvider {
  jobServiceProvider(callAsCurrentUser: APICaller): ReturnType<typeof jobServiceProvider>;
}

export function getJobServiceProvider(checkLicense: () => void) {
  return {
    jobServiceProvider(callAsCurrentUser: APICaller) {
      checkLicense();
      return jobServiceProvider(callAsCurrentUser);
    },
  };
}
