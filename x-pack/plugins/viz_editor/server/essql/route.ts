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

/**
 * Expose a RESTful endpoint that runs an Elasticsearch query based on our
 * query model, and returns a tabular result.
 */
export function route(server: Legacy.Server) {
  const { callWithRequest } = server.plugins.elasticsearch.createCluster('sql', {});

  server.route({
    path: `${API_PREFIX}/sqlfields`,
    method: 'POST',
    async handler(req) {
      const payload = req.payload as any;
      const result = await callWithRequest(req, 'transport.request', {
        path: '/_sql?format=json',
        method: 'POST',
        body: {
          query: payload.sql,
          fetch_size: 1,
        },
      });

      return result.columns;
    },
  });
}
