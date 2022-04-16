/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export async function fetchAvailableCcs(esClient: ElasticsearchClient): Promise<string[]> {
  const availableCcs = [];
  const response = await esClient.cluster.remoteInfo();
  for (const remoteName in response) {
    if (!response.hasOwnProperty(remoteName)) {
      continue;
    }
    const remoteInfo = response[remoteName];
    if (remoteInfo.connected) {
      availableCcs.push(remoteName);
    }
  }
  return availableCcs;
}

export async function fetchAvailableCcsLegacy(callCluster: any): Promise<string[]> {
  const availableCcs = [];
  const response = await callCluster('cluster.remoteInfo');
  for (const remoteName in response) {
    if (!response.hasOwnProperty(remoteName)) {
      continue;
    }
    const remoteInfo = response[remoteName];
    if (remoteInfo.connected) {
      availableCcs.push(remoteName);
    }
  }
  return availableCcs;
}
