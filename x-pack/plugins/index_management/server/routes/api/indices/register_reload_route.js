/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';
import { fetchAliases } from './fetch_aliases';

function getIndexNamesFromPayload(payload) {
  return payload.indexNames || [];
}

function formatHits(hits, aliases) {
  return hits.map(hit => {
    return {
      health: hit.health,
      status: hit.status,
      name: hit.index,
      uuid: hit.uuid,
      primary: hit.pri,
      replica: hit.rep,
      documents: hit["docs.count"],
      documents_deleted: hit["docs.deleted"],
      size: hit["store.size"],
      primary_size: hit["pri.store.size"],
      aliases: aliases.hasOwnProperty(hit.index) ? aliases[hit.index] : 'none',
    };
  });
}

async function fetchIndices(callWithRequest, indexNames) {
  const params = {
    format: 'json',
    index: indexNames
  };

  return await callWithRequest('cat.indices', params);
}

export function registerReloadRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/indices/reload',
    method: 'POST',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const indexNames = getIndexNamesFromPayload(request.payload);

      try {
        const indices = await fetchIndices(callWithRequest, indexNames);
        const aliases = await fetchAliases(callWithRequest);
        const response = formatHits(indices, aliases);
        reply(response);
      } catch (err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }

        reply(wrapUnknownError(err));
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
