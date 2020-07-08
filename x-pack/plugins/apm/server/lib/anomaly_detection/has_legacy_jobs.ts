/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../helpers/setup_request';

// Determine whether there are any legacy ml jobs.
// A legacy ML job has a job id suffix "high_mean_response_time" and a field_name of "transaction.duration.us"
export async function hasLegacyJobs(setup: Setup) {
  const { ml } = setup;
  const res = await ml?.mlSystem.mlAnomalySearch({
    terminateAfter: 1,
    size: 0,
    body: {
      query: {
        bool: {
          filter: [
            { term: { field_name: 'transaction.duration.us' } },
            { wildcard: { job_id: '*high_mean_response_time' } },
          ],
        },
      },
    },
  });

  // types are for the old `hits.total` format
  // @ts-ignore
  return res?.hits.total.value > 0;
}
