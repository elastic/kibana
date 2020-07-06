/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export async function verifyCcsAvailability(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  const response = await callWithRequest(req, 'cluster.remoteInfo');
  for (const remoteName in response) {
    if (!response.hasOwnProperty(remoteName)) {
      continue;
    }
    const remoteInfo = response[remoteName];
    if (!remoteInfo.connected) {
      throw Boom.serverUnavailable(
        `There seems to be some issues with ${remoteName} ` +
          `cluster. Please make sure it's connected and has at least one node.`
      );
    }
  }
}
