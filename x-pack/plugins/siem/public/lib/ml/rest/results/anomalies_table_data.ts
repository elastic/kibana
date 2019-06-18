/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

const payload = {
  jobIds: ['derivative-auth-rare-username-by-source-ip'],
  criteriaFields: [],
  influencers: [],
  aggregationInterval: 'auto',
  threshold: 0,
  earliestMs: 1554099916000,
  latestMs: 1560541690000,
  dateFormatTz: 'America/Denver',
  maxRecords: 500,
  maxExamples: 10,
};

// const anomaliesTable;

export const anomaliesTableData = async (jobIds = payload) => {
  console.log('getting jobs');
  const response = await fetch('/api/ml/results/anomalies_table_data', {
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
