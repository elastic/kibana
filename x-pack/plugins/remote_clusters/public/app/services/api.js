/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { UIM_CLUSTER_ADD, UIM_CLUSTER_UPDATE } from '../constants';
import { trackUserRequest } from './track_ui_metric';

let httpClient;

export const setHttpClient = (client) => {
  httpClient = client;
};

export const getHttpClient = () => {
  return httpClient;
};

const apiPrefix = chrome.addBasePath('/api/remote_clusters');

export async function loadClusters() {
  const response = await httpClient.get(apiPrefix);
  return response.data;
}

export async function addCluster(cluster) {
  const request = httpClient.post(apiPrefix, cluster);
  return await trackUserRequest(request, UIM_CLUSTER_ADD);
}

export async function editCluster(cluster) {
  const {
    name,
    ...rest
  } = cluster;

  const request = httpClient.put(`${apiPrefix}/${name}`, rest);
  return await trackUserRequest(request, UIM_CLUSTER_UPDATE);
}

export function removeClusterRequest(name) {
  return httpClient.delete(`${apiPrefix}/${name}`);
}
