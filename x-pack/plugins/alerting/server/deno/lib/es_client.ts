/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client as ElasticsearchClient } from 'npm:@elastic/elasticsearch';

if (!Deno.env.get('ELASTICSEARCH_API_KEY')) {
  throw new Error('ELASTICSEARCH_API_KEY not set');
}
if (typeof Deno.env.get('ELASTICSEARCH_API_KEY') !== 'string') {
  throw new Error('ELASTICSEARCH_API_KEY not a string');
}

// Using without security enabled for now. To use with --ssl, we will have to pass in
// tls options like packages/core/elasticsearch/core-elasticsearch-client-server-internal/src/configure_client.ts
// Will also have to determine whether the ES is secure or insecure
export const esClient = new ElasticsearchClient({
  node: 'http://127.0.0.1:9200',
  auth: {
    apiKey: Deno.env.get('ELASTICSEARCH_API_KEY') as string,
  },
});
