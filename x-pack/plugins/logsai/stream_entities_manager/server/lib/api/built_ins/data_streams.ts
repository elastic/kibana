/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiScraperDefinition } from '../../../../common/types';

export const dataStreams: ApiScraperDefinition = {
  id: 'data_streams',
  name: 'Data streams in Elasticsearch',
  identityFields: ['name'],
  metrics: [],
  metadata: [
    {
      source: 'timestamp_field.name',
      destination: 'timestampField',
      fromRoot: false,
    },
    { source: 'status', destination: 'status', fromRoot: false },
    { source: 'template', destination: 'template', fromRoot: false },
    { source: 'ilm_policy', destination: 'ilm_policy', fromRoot: false },
    { source: 'hidden', destination: 'hidden', fromRoot: false },
    { source: 'system', destination: 'system', fromRoot: false },
    { source: 'indices', destination: 'indices', fromRoot: false },
    {
      source: 'name',
      destination: 'data_stream',
      fromRoot: false,
      expand: {
        regex: '^([^-]+)-([^-]+)-([^-]+)$',
        map: ['data_stream.type', 'data_stream.dataset', 'data_stream.namespace'],
      },
    },
  ],
  source: {
    type: 'elasticsearch_api',
    endpoint: '_data_stream',
    method: 'GET',
    params: {
      body: {},
      query: {},
    },
    collect: {
      path: 'data_streams',
      keyed: false,
    },
  },
  managed: true,
};
