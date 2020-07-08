/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../helpers/setup_request';
import { getMlJobsWithAPMGroup } from './get_ml_jobs_by_group';

// Determine whether there are any legacy ml jobs.
// A legacy ML job has a job id that ends with "high_mean_response_time" and created_by=ml-module-apm-transaction
export async function hasLegacyJobs(setup: Setup) {
  const { ml } = setup;

  if (!ml) {
    return false;
  }

  const response = await getMlJobsWithAPMGroup(ml);
  return response.jobs.some(
    (job) =>
      job.job_id.endsWith('high_mean_response_time') &&
      job.custom_settings?.created_by === 'ml-module-apm-transaction'
  );
}
