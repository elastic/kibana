/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Temp disable eslint...

/* eslint-disable */

import chrome from 'ui/chrome';

const apiPrefix = chrome.addBasePath('/api/cross_cluster_replication');

// This is an Angular service, which is why we use this provider pattern to access it within
// our React app.
let httpClient;

export function setHttpClient(client) {
  httpClient = client;
}

// ---

export const loadAutoFollowPatterns = async () => {
  // const { data: { clusters } } = await httpClient.get(`${apiPrefix}/clusters`);
  // return clusters;

  /**
   * Temp to test async call with apiMiddleware
   */
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ good: 'job' });
    }, 2000);
  });
};
