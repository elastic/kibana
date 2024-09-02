/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';

import type { UserStartPrivilegesResponse } from '../../common/types';

export async function fetchUserStartPrivileges(
  client: ElasticsearchClient,
  logger: Logger,
  indexName: string = 'test-index-name'
): Promise<UserStartPrivilegesResponse> {
  try {
    const securityCheck = await client.security.hasPrivileges({
      cluster: ['manage_api_key'],
      index: [
        {
          names: [indexName],
          privileges: ['create_index'],
        },
      ],
    });

    return {
      privileges: {
        canCreateIndex: securityCheck?.index?.[indexName]?.create_index ?? false,
        canCreateApiKeys: securityCheck?.cluster?.manage_api_key ?? false,
      },
    };
  } catch (e) {
    logger.error(`Error checking user privileges for searchIndices elasticsearch start`);
    logger.error(e);
    return {
      privileges: {
        canCreateIndex: false,
        canCreateApiKeys: false,
      },
    };
  }
}
