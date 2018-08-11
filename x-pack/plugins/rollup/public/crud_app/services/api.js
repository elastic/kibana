/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';

export async function loadJobs() {
  const { jobs } = await kfetch({
    pathname: `/api/rollup/jobs`,
    method: 'GET',
  });

  return jobs;
}
