/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export function createShipperApiKey(
  esClient: ElasticsearchClient,
  name: string
) {
  return esClient.security.createApiKey({
    body: {
      name: `standalone_agent_custom_logs_${name}`,
      metadata: { application: 'logs' },
      role_descriptors: {
        standalone_agent: {
          cluster: ['monitor'],
          indices: [
            {
              names: ['logs-*-*', 'metrics-*-*'],
              privileges: ['auto_configure', 'create_doc'],
            },
          ],
        },
      },
    },
  });
}

export function _createShipperApiKey(
  esClient: ElasticsearchClient,
  name: string
) {
  return esClient.security.createApiKey({
    body: {
      name: `custom-logs-standalone-elastic-agent-${name}`,
      metadata: {
        application: 'logs',
      },
      role_descriptors: {
        superuser: {
          cluster: ['all'],
          indices: [
            {
              names: ['*'],
              privileges: ['all'],
              allow_restricted_indices: false,
            },
            {
              names: ['*'],
              privileges: [
                'monitor',
                'read',
                'view_index_metadata',
                'read_cross_cluster',
              ],
              allow_restricted_indices: true,
            },
          ],
          run_as: ['*'],
        },
      },
    },
  });
}
