/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

/**
 * Creates a short lived API key with the necessary permissions to install integrations
 */
export function createInstallApiKey(esClient: ElasticsearchClient, name: string) {
  // security.authz.applicationName
  return esClient.security.createApiKey({
    name: `onboarding_install_${name}`,
    expiration: '1h', // This API key is only used for initial setup and should be short lived
    metadata: {
      managed: true,
      application: 'logs',
    },
    role_descriptors: {
      can_install_integrations: {
        cluster: [],
        indices: [],
        applications: [
          {
            application: 'kibana-.kibana',
            privileges: ['feature_fleet.all', 'feature_fleetv2.all'], // Moving forwards only the `feature_fleet.all` privilege will be needed
            resources: ['*'],
          },
        ],
      },
    },
  });
}
