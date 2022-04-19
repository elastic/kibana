/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlSummaryJob } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { isSecurityJob } from './is_security_job';

describe('isSecurityJob', () => {
  it('counts a job with a group of "siem"', () => {
    const job = { groups: ['siem', 'other'] } as MlSummaryJob;
    expect(isSecurityJob(job)).toEqual(true);
  });

  it('counts a job with a group of "security"', () => {
    const job = { groups: ['security', 'other'] } as MlSummaryJob;
    expect(isSecurityJob(job)).toEqual(true);
  });

  it('counts a job in both "security" and "siem"', () => {
    const job = { groups: ['siem', 'security'] } as MlSummaryJob;
    expect(isSecurityJob(job)).toEqual(true);
  });

  it('does not count a job in a related group', () => {
    const job = { groups: ['auditbeat', 'process'] } as MlSummaryJob;
    expect(isSecurityJob(job)).toEqual(false);
  });
});
