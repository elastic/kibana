/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityRequestHandlerContext } from '@kbn/core-security-server';

import { toAlphanumeric } from '../../../common/utils/to_alphanumeric';

export const createApiKey = async (
  security: SecurityRequestHandlerContext,
  indexName: string,
  keyName: string
) => {
  return await security.authc.apiKeys.create({
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
