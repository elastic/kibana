/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UIM_CLUSTER_ADD, UIM_CLUSTER_UPDATE } from '../constants';
import { trackUserRequest } from './ui_metric';
import { sendGet, sendPost, sendPut, sendDelete, SendGetOptions } from './http';
import { Cluster } from '../../../common/lib';

export async function loadClusters(options?: SendGetOptions) {
  return await sendGet(undefined, options);
}

export async function addCluster(cluster: Cluster) {
  const request = sendPost('', cluster);

  return await trackUserRequest(request, UIM_CLUSTER_ADD);
}

export async function editCluster(cluster: Cluster) {
  const { name, ...rest } = cluster;
  const request = sendPut(name, rest);

  return await trackUserRequest(request, UIM_CLUSTER_UPDATE);
}

export function removeClusterRequest(name: string) {
  return sendDelete(name);
}
