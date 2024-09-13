/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const createApiKey = async (
  client: IScopedClusterClient,
  searchApplicationName: string,
  keyName: string
) => {
  return await client.asCurrentUser.security.createApiKey({
    name: keyName,
    role_descriptors: {
      [`${searchApplicationName}-key-role`]: {
        cluster: [],
        indices: [
          {
            names: [`${searchApplicationName}`],
            privileges: ['read'],
          },
        ],
        restriction: {
          workflows: ['search_application_query'],
        },
      },
    },
  });
};
