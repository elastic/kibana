/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';

export async function fetchUserStartPrivileges(
  client: ElasticsearchClient,
  logger: Logger
): Promise<boolean> {
  try {
    const securityCheck = await client.security.hasPrivileges({
      cluster: ['manage_own_api_key'],
    });

    return securityCheck?.cluster?.manage_own_api_key ?? false;
  } catch (e) {
    logger.error(`Error checking user privileges for search API Keys`);
    logger.error(e);
    return false;
  }
}

export async function fetchClusterHasApiKeys(
  client: ElasticsearchClient,
  logger: Logger
): Promise<boolean> {
  try {
    const clusterApiKeys = await client.security.queryApiKeys({
      query: {
        term: {
          invalidated: false,
        },
      },
    });
    return clusterApiKeys.api_keys.length > 0;
  } catch (e) {
    logger.error(`Error checking cluster for existing valid API keys`);
    logger.error(e);
    return true;
  }
}
