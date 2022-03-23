/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockJobs } from '../../common/test';
import * as jobTypes from '../../common/constants/job_types';
import { Job } from './job';

describe('Job', () => {
  it('should provide a pretty name for all known job types', () => {
    for (const jobType of Object.values(jobTypes)) {
      const job = new Job({ ...mockJobs[0], jobtype: jobType });
      expect(job.prettyJobTypeName).toEqual(expect.any(String));
    }
  });

  it('should provide "undefined" for unknown job types', () => {
    const job = new Job({ ...mockJobs[0], jobtype: 'foo' });
    expect(job.prettyJobTypeName).toBeUndefined();
  });
});
