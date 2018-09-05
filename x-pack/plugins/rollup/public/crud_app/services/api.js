/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

let httpClient;

export const setHttpClient = (client) => {
  httpClient = client;
};

const apiPrefix = chrome.addBasePath('/api/rollup');

export async function loadJobs() {
  const { data: { jobs } } = await httpClient.get(`${apiPrefix}/jobs`);
  return jobs;
}

export async function startJobs(jobIds) {
  const body = { jobIds };
  return await httpClient.post(`${apiPrefix}/start`, body);
}

export async function stopJobs(jobIds) {
  const body = { jobIds };
  return await httpClient.post(`${apiPrefix}/stop`, body);
}

export async function deleteJobs(jobIds) {
  const body = { jobIds };
  return await httpClient.post(`${apiPrefix}/delete`, body);
}

export async function createJob(job) {
  const body = { job };
  return await httpClient.put(`${apiPrefix}/create`, body);
}
