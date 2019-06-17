/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

const payload = { jobIds: [] };

export const getJobs = async (jobIds = payload) => {
  console.log('getting jobs');
  const response = await fetch('/api/ml/jobs/jobs_summary', {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify(jobIds),
    headers: {
      'kbn-xsrf': chrome.getXsrfToken(),
    },
  });
  const json = await response.json();
  console.log('my jobs are -->', json);
};
