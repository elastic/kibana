/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';

/**
 * Check if an esClient has enought permission to create a valid API key for logstash
 *
 * @param esClient
 */
export async function canCreateLogstashApiKey(esClient: ElasticsearchClient) {
  const res = await esClient.security.hasPrivileges({
    cluster: ['monitor', 'manage_own_api_key'],
    index: [
      {
        names: [
          'logs-*-*',
          'metrics-*-*',
          'traces-*-*',
          'synthetics-*-*',
          '.logs-endpoint.diagnostic.collection-*',
          '.logs-endpoint.action.responses-*',
        ],
        privileges: ['auto_configure', 'create_doc'],
      },
    ],
  });

  return res.has_all_requested;
}

/**
 * Generate an Elasticsearch API key to use in logstash ES output
 *
 * @param esClient
 */
export async function generateLogstashApiKey(esClient: ElasticsearchClient) {
  const apiKey = await esClient.security.createApiKey({
    name: 'Fleet Logstash output',
    metadata: {
      managed_by: 'fleet',
      managed: true,
      type: 'logstash',
    },
    role_descriptors: {
      'logstash-output': {
        cluster: ['monitor'],
        index: [
          {
            names: [
              'logs-*-*',
              'metrics-*-*',
              'traces-*-*',
              'synthetics-*-*',
              '.logs-endpoint.diagnostic.collection-*',
              '.logs-endpoint.action.responses-*',
            ],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    },
  });

  return apiKey;
}
