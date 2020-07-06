/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export async function fetchAvailableCcs(callCluster: any): Promise<string[]> {
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
