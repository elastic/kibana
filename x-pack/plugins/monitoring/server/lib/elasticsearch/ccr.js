/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export function handleResponse(response) {
  let enabled = true;
  const sources = ['persistent', 'transient', 'defaults'];
  for (const source of sources) {
    const ccrEnabled = get(response[source], 'xpack.monitoring.ccr.enabled');
    if (ccrEnabled === false) {
      enabled = false;
    }
  }

  return enabled;
}

export async function checkCcrEnabled(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'transport.request', {
    method: 'GET',
    path: '/_cluster/settings?include_defaults',
    filter_path: [
      'defaults.xpack.ccr.enabled',
      'persistent.xpack.ccr.enabled',
      'transient.xpack.ccr.enabled'
    ]
  });

  return handleResponse(response);
}
