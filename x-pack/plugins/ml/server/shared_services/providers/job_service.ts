/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { LicenseCheck } from '../license_checks';
import { jobServiceProvider } from '../../models/job_service';

export interface JobServiceProvider {
  jobServiceProvider(callAsCurrentUser: APICaller): ReturnType<typeof jobServiceProvider>;
}

export function getJobServiceProvider(isFullLicense: LicenseCheck): JobServiceProvider {
  return {
    jobServiceProvider(callAsCurrentUser: APICaller) {
      isFullLicense();
      return jobServiceProvider(callAsCurrentUser);
    },
  };
}
