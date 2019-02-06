/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerRoute } from '../../../../../../server/lib/register_route';

const handler = async (request, callWithRequest, h) => {
  const { maxNumSegments, indices = [] } = request.payload;
  const params = {
    expandWildcards: 'none',
    index: indices,
  };
  if (maxNumSegments) {
    params.max_num_segments = maxNumSegments;
  }

  await callWithRequest('indices.forcemerge', params);
  return h.response();
};
export function registerForcemergeRoute(server, pluginId) {
  registerRoute({
    server,
    handler,
    pluginId,
    path: '/api/index_management/indices/forcemerge',
    method: 'POST'
  });
}