/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export function handleResponse(response) {
  return get(response.defaults, 'xpack.ccr.enabled') === 'true';
}

export async function checkCcrEnabled(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'transport.request', {
    method: 'GET',
    path: '/_cluster/settings?include_defaults',
    filter_path: [
      'defaults.xpack.ccr.enabled',
    ]
  });

  return handleResponse(response);
}
