/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export const doesLogsEndpointActionsIndexExist = async ({
  esClient,
  logger,
  indexName,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexName: string;
}): Promise<boolean> => {
  try {
    const doesIndexExist = await esClient.indices.exists(
      {
        index: indexName,
      },
      { meta: true }
    );
    return doesIndexExist.statusCode !== 404;
  } catch (error) {
    const errorType = error?.type ?? '';
    if (errorType !== 'index_not_found_exception') {
      logger.error(error);
      throw error;
    }
    return false;
  }
};
