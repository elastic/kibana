/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const createMlJobsQuery = (jobIds: string[]) => ({
  method: 'GET',
  path: `/_ml/anomaly_detectors/${jobIds.join(',')}`,
  query: {
    allow_no_jobs: true,
  },
});

export const mlJobRT = rt.type({
  job_id: rt.string,
  custom_settings: rt.unknown,
});

export const mlJobsResponseRT = rt.type({
  jobs: rt.array(mlJobRT),
});
