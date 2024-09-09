/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export function createStandaloneAgentApiKey(esClient: ElasticsearchClient, name: string) {
  // Based on https://www.elastic.co/guide/en/fleet/master/grant-access-to-elasticsearch.html#create-api-key-standalone-agent
  return esClient.security.createApiKey({
    body: {
      name: `standalone_agent-${name}`,
      metadata: {
        managed: true,
      },
      role_descriptors: {
        standalone_agent: {
          cluster: ['monitor'],
          indices: [
            {
              names: ['logs-*-*', 'metrics-*-*', 'traces-*-*', 'synthetics-*-*'],
              privileges: ['auto_configure', 'create_doc'],
            },
          ],
        },
      },
    },
  });
}
