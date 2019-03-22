/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { API_PREFIX } from '../../common';
import { Query } from './query_types';
import { toEsQuery, toTable } from './to_es_query';

export function route(server: Legacy.Server) {
  const { callWithRequest } = server.plugins.elasticsearch.createCluster('data', {});

  server.route({
    path: `${API_PREFIX}/search`,
    method: 'POST',
    async handler(req) {
      const query = req.payload as Query;
      const esQuery = toEsQuery(query);
      const result = await callWithRequest(req, 'search', esQuery);

      return {
        rows: toTable(query, result),
      };
    },
  });
}
