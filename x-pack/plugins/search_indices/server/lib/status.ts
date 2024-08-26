/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

import type { IndicesStatusResponse, UserStartPrivilegesResponse } from '../../common/types';

import { isHidden, isClosed } from '../utils/index_utils';

export async function fetchIndicesStatus(
  client: ElasticsearchClient,
  logger: Logger
): Promise<IndicesStatusResponse> {
  const indexMatches = await client.indices.get({
    expand_wildcards: ['open'],
    // for better performance only compute settings of indices but not mappings
    features: ['settings'],
    index: '*',
  });

  const indexNames = Object.keys(indexMatches).filter(
    (indexName) =>
      indexMatches[indexName] &&
      !isHidden(indexMatches[indexName]) &&
      !isClosed(indexMatches[indexName])
  );

  return {
    indexNames,
  };
}

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
