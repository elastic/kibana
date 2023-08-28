/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  IndicesCreateRequest,
  IndicesCreateResponse,
} from '@elastic/elasticsearch/lib/api/types';

export const createIndex = async ({
  esClient,
  logger,
  options,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  options: IndicesCreateRequest;
}): Promise<IndicesCreateResponse | void> => {
  try {
    const isIndexExist = await esClient.indices.exists({
      index: options.index,
    });
    if (isIndexExist) {
      logger.info('${options.index} already exist');
      return;
    }

    return esClient.indices.create(options);
  } catch (err) {
    const error = transformError(err);
    const fullErrorMessage = `Failed to create index: ${options.index}: ${error.message}`;
    logger.error(fullErrorMessage);
    throw new Error(fullErrorMessage);
  }
};
