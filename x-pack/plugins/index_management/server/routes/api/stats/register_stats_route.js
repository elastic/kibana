/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

function formatHit(hit, indexName) {
  const { _shards, indices } = hit;
  const stats = indices[indexName];
  return {
    _shards,
    stats
  };
}

async function fetchStats(callWithRequest, indexName) {
  const params = {
    expand_wildcards: 'none',
    index: indexName,
  };

  return await callWithRequest('indices.stats', params);
}

export function registerStatsRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/stats/{indexName}',
    method: 'GET',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { indexName } = request.params;

      try {
        const hit = await fetchStats(callWithRequest, indexName);
        const response = formatHit(hit, indexName);

        return response;
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }

        throw wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
