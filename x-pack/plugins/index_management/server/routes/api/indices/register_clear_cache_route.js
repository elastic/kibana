/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerRoute } from '../../../../../../server/lib/register_route';

const handler = async (request, callWithRequest, h) => {
  const indices = request.payload.indices || [];
  const params = {
    expandWildcards: 'none',
    format: 'json',
    index: indices
  };

  await callWithRequest('indices.clearCache', params);
  return h.response();
};
export function registerClearCacheRoute(server, pluginId) {
  registerRoute({
    server,
    handler,
    pluginId,
    path: '/api/index_management/indices/clear_cache',
    method: 'POST'
  });
}
