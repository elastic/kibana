/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';
import { getIndexManagementDataEnrichers } from '../../../../index_management_data';
function formatHits(hits) {
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
    };
  });
}

async function fetchIndices(callWithRequest) {
  const params = {
    format: 'json'
  };

  return await callWithRequest('cat.indices', params);
}

export function registerListRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/indices',
    method: 'GET',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const hits = await fetchIndices(callWithRequest);
        let response = formatHits(hits);
        const dataEnrichers = getIndexManagementDataEnrichers();
        for (let i = 0; i < dataEnrichers.length; i++) {
          const dataEnricher = dataEnrichers[i];
          response = await dataEnricher(response, callWithRequest);
        }
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
