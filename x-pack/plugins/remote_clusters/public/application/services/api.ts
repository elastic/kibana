/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Cluster } from '../../../common/lib';
import { UIM_CLUSTER_ADD, UIM_CLUSTER_UPDATE } from '../constants';
import { SendGetOptions, sendDelete, sendGet, sendPost, sendPut } from './http';
import { trackUserRequest } from './ui_metric';

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
