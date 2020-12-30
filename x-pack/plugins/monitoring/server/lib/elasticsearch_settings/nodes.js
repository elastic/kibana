/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { findReason } from './find_reason';

export function handleResponse({ nodes = {} } = {}) {
  const nodeIds = Object.keys(nodes);
  for (const nodeId of nodeIds) {
    const nodeSettings = get(nodes, [nodeId, 'settings']);
    if (nodeSettings !== undefined) {
      const monitoringSettings = get(nodeSettings, 'xpack.monitoring');
      const check = findReason(monitoringSettings, {
        context: `nodeId: ${nodeId}`,
      });

      if (check.found) {
        return check;
      }
    }
  }

  return { found: false };
}

export async function checkNodesSettings(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const response = await callWithRequest(req, 'transport.request', {
    method: 'GET',
    path: '/_nodes/settings',
    filter_path: ['nodes'], // NOTE: this doesn't seem to do anything when used with elasticsearch-js. In Console, it does work though
  });

  return handleResponse(response);
}
