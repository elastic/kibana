/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const createApiKey = async (
  client: IScopedClusterClient,
  engineName: string,
  keyName: string
) => {
  return await client.asCurrentUser.security.createApiKey({
    name: keyName,
    role_descriptors: {
      [`${engineName}-key-role`]: {
        applications: [
          {
            application: 'enterprise-search',
            privileges: ['engine:read'],
            resources: [`engine:${engineName}`],
          },
        ],
      },
    },
  });
};
