/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { CreateEsIndexRequestBody } from '../../../../../common/api/entity_analytics/risk_score';

export const createIndex = async ({
  esClient,
  logger,
  options,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  options: CreateEsIndexRequestBody;
}) => {
  try {
    await esClient.indices.create({
      index: options.index,
      mappings:
        typeof options.mappings === 'string' ? JSON.parse(options.mappings) : options.mappings,
    });
    return { [options.index]: { success: true, error: null } };
  } catch (err) {
    const error = transformError(err);
    logger.error(`Failed to create index: ${options.index}: ${error.message}`);

    return { [options.index]: { success: false, error } };
  }
};
