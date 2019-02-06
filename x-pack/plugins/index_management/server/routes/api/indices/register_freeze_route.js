/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerRoute } from '../../../../../../server/lib/register_route';

const handler = async (request, callWithRequest, h) => {
  const { indices = [] } = request.payload;
  const params = {
    path: `/${encodeURIComponent(indices.join(','))}/_freeze`,
    method: 'POST',
  };

  await callWithRequest('transport.request', params);
  return h.response();
};
export function registerFreezeRoute(server, pluginId) {
  registerRoute({
    server,
    handler,
    pluginId,
    path: '/api/index_management/indices/freeze',
    method: 'POST'
  });
}
