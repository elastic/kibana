/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ------------------------------------------------------------------------------------------
// This file contains all restful endpoints pertaining to query execution for viz-editor
// ------------------------------------------------------------------------------------------

import { Legacy } from 'kibana';
import { API_PREFIX, BasicFieldType } from '../../common';

export function normalizeType(type: string) {
  const normalTypes = {
    string: ['string', 'text', 'keyword', '_type', '_id', '_index'],
    number: [
      'float',
      'half_float',
      'scaled_float',
      'double',
      'integer',
      'long',
      'short',
      'byte',
      'token_count',
      '_version',
    ],
    date: ['date', 'datetime'],
    boolean: ['boolean'],
  } as { [key in BasicFieldType]: string[] };

  const normalizedType = Object.keys(normalTypes).find(t =>
    normalTypes[t as BasicFieldType].includes(type)
  );

  if (normalizedType) {
    return normalizedType;
  }
  throw new Error(`Type not supported: ${type}`);
}

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

      return result.columns.map((column: any) => ({ ...column, type: normalizeType(column.type) }));
    },
  });
}
