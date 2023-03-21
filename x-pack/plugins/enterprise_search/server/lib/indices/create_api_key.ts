/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';

import { SecurityPluginStart } from '@kbn/security-plugin/server';

import { toAlphanumeric } from '../../../common/utils/to_alphanumeric';

export const createApiKey = async (
  request: KibanaRequest,
  security: SecurityPluginStart,
  indexName: string,
  keyName: string
) => {
  return await security.authc.apiKeys.create(request, {
    name: keyName,
    role_descriptors: {
      [`${toAlphanumeric(indexName)}-key-role`]: {
        cluster: [],
        index: [
          {
            names: [indexName],
            privileges: ['all'],
          },
        ],
      },
    },
  });
};
