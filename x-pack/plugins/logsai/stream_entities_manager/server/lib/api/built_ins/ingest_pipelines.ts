/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiScraperDefinition } from '../../../../common/types';

export const ingestPipelines: ApiScraperDefinition = {
  id: 'ingest_pipelines',
  name: 'Ingest pipelines in Elasticsearch',
  identityFields: ['_key'],
  metrics: [],
  metadata: [
    { source: 'description', destination: 'description', fromRoot: false },
    { source: 'processors', destination: 'processors', fromRoot: false },
    { source: '_meta', destination: '_meta', fromRoot: false },
  ],
  source: {
    type: 'elasticsearch_api',
    endpoint: '_ingest/pipeline',
    method: 'GET',
    params: {
      body: {},
      query: {},
    },
    collect: {
      path: '.',
      keyed: true,
    },
  },
  managed: true,
};
