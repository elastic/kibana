/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MlJob,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

export function apmMlJobsQuery(jobs: MlJob[]) {
  if (!jobs.length) {
    throw new Error('At least one ML job should be given');
  }

  return [
    {
      terms: {
        job_id: jobs.map((job) => job.job_id),
      },
    },
  ] as QueryDslQueryContainer[];
}
