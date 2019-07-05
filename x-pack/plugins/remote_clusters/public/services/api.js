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
const apiPrefix = chrome.addBasePath('/api/remote_clusters');

export async function loadClusters() {
  const response = await httpClient.get(`${apiPrefix}`);
  return response.data;
}

export async function addCluster(cluster) {
  return await httpClient.post(`${apiPrefix}`, cluster);
}

export async function editCluster(cluster) {
  const {
    name,
    ...rest
  } = cluster;

  return await httpClient.put(`${apiPrefix}/${name}`, rest);
}

export function removeClusterRequest(name) {
  return httpClient.delete(`${apiPrefix}/${name}`);
}
