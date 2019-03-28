/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ------------------------------------------------------------------------------------------
// This file contains all restful endpoints pertaining to query execution for viz-editor
// ------------------------------------------------------------------------------------------

import { Legacy } from 'kibana';
import { API_PREFIX, Query } from '../../common';
import { toEsQuery } from './to_es_query';
import { toTable } from './to_table';

/**
 * Expose a RESTful endpoint that runs an Elasticsearch query based on our
 * query model, and returns a tabular result.
 */
export function route(server: Legacy.Server) {
  const { callWithRequest } = server.plugins.elasticsearch.createCluster('data', {});

  server.route({
    path: `${API_PREFIX}/search`,
    method: 'POST',
    async handler(req) {
      const { query, indexpattern } = req.payload as { query: Query; indexpattern: string };
      const esQuery = toEsQuery(query);
      const result = await callWithRequest(req, 'search', {
        index: indexpattern,
        body: esQuery,
      });

      return toTable(query, result);
    },
  });
}
