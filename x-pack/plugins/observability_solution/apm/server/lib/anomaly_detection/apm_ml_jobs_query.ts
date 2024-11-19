/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ApmMlJob } from '../../../common/anomaly_detection/apm_ml_job';

export function apmMlJobsQuery(jobs: ApmMlJob[]) {
  if (!jobs.length) {
    throw new Error('At least one ML job should be given');
  }

  return [
    {
      terms: {
        job_id: jobs.map((job) => job.jobId),
      },
    },
  ] as QueryDslQueryContainer[];
}
