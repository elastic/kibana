/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

export interface PayLoad {
  jobIds: string[];
  criteriaFields: string[];
  influencers: Array<{}>;
  aggregationInterval: string;
  threshold: number;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  maxRecords: number;
  maxExamples: number;
}

const payload: PayLoad = {
  jobIds: [],
  criteriaFields: [],
  influencers: [],
  aggregationInterval: 'auto',
  threshold: 0,
  earliestMs: 0,
  latestMs: 1560607707000,
  dateFormatTz: 'America/Denver',
  maxRecords: 500,
  maxExamples: 10,
};

type Args = Partial<PayLoad>;

export const anomaliesTableData = async (customPayLoad: Args = payload) => {
  const body = { ...payload, ...customPayLoad };
  console.log('getting jobs with body of:', customPayLoad);
  const response = await fetch('/api/ml/results/anomalies_table_data', {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify(body),
    headers: {
      'kbn-system-api': 'true',
      'Content-Type': 'application/json',
      'kbn-xsrf': chrome.getXsrfToken(),
    },
  });
  const json = await response.json();
  console.log('my anomalies are -->', json);
  return json;
};
