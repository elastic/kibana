/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIM_CLUSTER_ADD, UIM_CLUSTER_UPDATE } from '../constants';
import { trackUserRequest } from './ui_metric';
import { sendGet, sendPost, sendPut, sendDelete } from './http';

export async function loadClusters() {
  return await sendGet();
}

export async function addCluster(cluster) {
  const request = sendPost('', cluster);

  return await trackUserRequest(request, UIM_CLUSTER_ADD);
}

export async function editCluster(cluster) {
  const { name, ...rest } = cluster;
  const request = sendPut(name, rest);

  return await trackUserRequest(request, UIM_CLUSTER_UPDATE);
}

export function removeClusterRequest(name) {
  return sendDelete(name);
}
