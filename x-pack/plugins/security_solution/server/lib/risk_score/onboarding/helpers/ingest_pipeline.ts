/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Pipeline } from '../../../../../common/types/risk_scores';

export const createIngestPipeline = async ({
  esClient,
  logger,
  options,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  options: string | Pipeline;
}) => {
  const pipeline = typeof options === 'string' ? JSON.parse(options) : options;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { name, description, processors, version, on_failure } = pipeline;

  try {
    await esClient.ingest.putPipeline({
      id: name,
      body: {
        description,
        processors,
        version,
        on_failure,
      },
    });

    return { [name]: { success: true, error: null } };
  } catch (err) {
    const error = transformError(err);
    logger.error(`Failed to create ingest pipeline: ${name}: ${error.message}`);

    return { [name]: { success: false, error } };
  }
};
